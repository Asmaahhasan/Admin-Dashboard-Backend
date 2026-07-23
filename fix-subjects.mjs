// fix-subjects.mjs
// Moves all subjects from "الصف السادس الابتدائي" (both semesters)
// to "الصف الأول الابتدائي" (matching semesters by order)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Find grade 6 and grade 1
  const grades = await prisma.grade.findMany({
    where: {
      name: { in: ['الصف الأول الابتدائي', 'الصف السادس الابتدائي'] }
    },
    include: {
      semesters: { orderBy: { order: 'asc' } }
    }
  });

  const grade6 = grades.find(g => g.name === 'الصف السادس الابتدائي');
  const grade1 = grades.find(g => g.name === 'الصف الأول الابتدائي');

  if (!grade6 || !grade1) {
    console.log('❌ لم يتم إيجاد الصفوف المطلوبة:');
    console.log('   الصفوف الموجودة:', grades.map(g => g.name));
    return;
  }

  console.log(`✅ الصف السادس  ID: ${grade6.id}  (${grade6.semesters.length} فصل)`);
  console.log(`✅ الصف الأول   ID: ${grade1.id}  (${grade1.semesters.length} فصل)`);

  // 2. For each semester in grade 6, get subjects and move them to grade 1
  for (const sem6 of grade6.semesters) {
    // Find matching semester in grade 1 by order
    const sem1 = grade1.semesters.find(s => s.order === sem6.order);
    if (!sem1) {
      console.log(`⚠️  لا يوجد فصل مطابق في الصف الأول للفصل: ${sem6.name} (order=${sem6.order})`);
      continue;
    }

    console.log(`\n📚 ${sem6.name} (rank ${sem6.order}) ➜ ${sem1.name}`);

    // Get subjects assigned to grade6/sem6
    const gradeSubjects = await prisma.gradeSubject.findMany({
      where: { gradeId: grade6.id, semesterId: sem6.id },
      include: { subject: true }
    });

    if (gradeSubjects.length === 0) {
      console.log('   (لا توجد مواد)');
      continue;
    }

    for (const gs of gradeSubjects) {
      console.log(`   ➤ ${gs.subject.name}`);

      // Check if subject is already in grade1/sem1
      const exists = await prisma.gradeSubject.findFirst({
        where: { gradeId: grade1.id, semesterId: sem1.id, subjectId: gs.subjectId }
      });

      if (exists) {
        console.log(`     ⏭️  موجودة مسبقاً في الصف الأول — تخطي`);
      } else {
        // Assign to grade 1
        await prisma.gradeSubject.create({
          data: { gradeId: grade1.id, semesterId: sem1.id, subjectId: gs.subjectId }
        });
        console.log(`     ✅ تم النسخ`);
      }

      // Delete from grade 6
      await prisma.gradeSubject.delete({ where: { id: gs.id } });
      console.log(`     🗑️  تم الحذف من الصف السادس`);
    }
  }

  console.log('\n🎉 انتهت العملية بنجاح!');
}

main()
  .catch(e => { console.error('❌ خطأ:', e.message); })
  .finally(() => prisma.$disconnect());
