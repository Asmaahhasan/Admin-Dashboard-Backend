import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanSemesters() {
  console.log('🔍 التفتيش على الفصول الدراسية وتنظيف المكررات...\n');

  const grades = await prisma.grade.findMany({
    include: {
      semesters: {
        orderBy: { order: 'asc' },
        include: {
          gradeSubjects: {
            include: { subject: true }
          }
        }
      }
    }
  });

  for (const g of grades) {
    console.log(`📌 الصف: ${g.name} (يحتوي على ${g.semesters.length} فصول دراسية في الداتابيز):`);
    
    // Group semesters by normalized name or order
    // We want exactly 2 semesters for each grade:
    // Order 1: "الفصل الدراسي الأول"
    // Order 2: "الفصل الدراسي الثاني"

    const sem1List = g.semesters.filter(s => s.order === 1 || s.name.includes('الأول') || s.name.includes('الاول'));
    const sem2List = g.semesters.filter(s => s.order === 2 || s.name.includes('الثاني'));

    console.log(`   الفصل الأول عنده ${sem1List.length} سجلات | الفصل الثاني عنده ${sem2List.length} سجلات`);

    // Clean Semester 1 duplicates
    if (sem1List.length > 1) {
      const targetSem = sem1List[0];
      // Update target name to 'الفصل الدراسي الأول' and order 1
      await prisma.semester.update({
        where: { id: targetSem.id },
        data: { name: 'الفصل الدراسي الأول', order: 1 }
      });

      for (let i = 1; i < sem1List.length; i++) {
        const dup = sem1List[i];
        console.log(`   🧹 دمج السجل المكرر للفصل الأول (ID: ${dup.id}, name: ${dup.name}) إلى Target (ID: ${targetSem.id})...`);

        // Move all gradeSubjects to targetSem
        for (const gs of dup.gradeSubjects) {
          const existsInTarget = await prisma.gradeSubject.findFirst({
            where: { gradeId: g.id, semesterId: targetSem.id, subjectId: gs.subjectId }
          });

          if (!existsInTarget) {
            await prisma.gradeSubject.update({
              where: { id: gs.id },
              data: { semesterId: targetSem.id }
            });
          } else {
            // Delete duplicate gradeSubject link
            await prisma.gradeSubject.delete({ where: { id: gs.id } });
          }
        }

        // Delete duplicate semester
        await prisma.semester.delete({ where: { id: dup.id } });
      }
    } else if (sem1List.length === 1) {
      await prisma.semester.update({
        where: { id: sem1List[0].id },
        data: { name: 'الفصل الدراسي الأول', order: 1 }
      });
    }

    // Clean Semester 2 duplicates
    if (sem2List.length > 1) {
      const targetSem = sem2List[0];
      // Update target name to 'الفصل الدراسي الثاني' and order 2
      await prisma.semester.update({
        where: { id: targetSem.id },
        data: { name: 'الفصل الدراسي الثاني', order: 2 }
      });

      for (let i = 1; i < sem2List.length; i++) {
        const dup = sem2List[i];
        console.log(`   🧹 دمج السجل المكرر للفصل الثاني (ID: ${dup.id}, name: ${dup.name}) إلى Target (ID: ${targetSem.id})...`);

        for (const gs of dup.gradeSubjects) {
          const existsInTarget = await prisma.gradeSubject.findFirst({
            where: { gradeId: g.id, semesterId: targetSem.id, subjectId: gs.subjectId }
          });

          if (!existsInTarget) {
            await prisma.gradeSubject.update({
              where: { id: gs.id },
              data: { semesterId: targetSem.id }
            });
          } else {
            await prisma.gradeSubject.delete({ where: { id: gs.id } });
          }
        }

        await prisma.semester.delete({ where: { id: dup.id } });
      }
    } else if (sem2List.length === 1) {
      await prisma.semester.update({
        where: { id: sem2List[0].id },
        data: { name: 'الفصل الدراسي الثاني', order: 2 }
      });
    }
  }

  console.log('\n✨ اكتمل التنظيف! أصبح لكل صف فصلان دراسيان فقط: (الفصل الدراسي الأول) و (الفصل الدراسي الثاني).');
}

cleanSemesters()
  .catch(err => {
    console.error('❌ خطأ:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
