// seed-elementary.mjs
// Reads screenshots reference and seeds subjects for grades 1-3 (elementary)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ── Reference subject lists from q.tahdiri.com screenshots ──
// Grade 2 — both semesters identical (10 subjects)
const GRADE2_SUBJECTS = [
  'اللغة العربية',
  'الرياضيات',
  'العلوم',
  'التربية الفنية',
  'المهارات الحياتية والأسرية',
  'التربية البدنية والدفاع عن النفس',
  'اللغة الإنجليزية',
  'القرآن الكريم والدراسات الإسلامية',
  'القرآن الكريم - مدارس التحفيظ',
  'القرآن الكريم - مدارس المناهج المقارنة',
];

// Grade 3 — Semester 1 (9 subjects, no مناهج مقارنة)
const GRADE3_SEM1_SUBJECTS = [
  'اللغة العربية',
  'التربية الفنية',
  'المهارات الحياتية والأسرية',
  'الرياضيات',
  'العلوم',
  'التربية البدنية والدفاع عن النفس',
  'اللغة الإنجليزية',
  'القرآن الكريم والدراسات الإسلامية',
  'القرآن الكريم - مدارس التحفيظ',
];

// Grade 3 — Semester 2 (10 subjects, with مناهج مقارنة)
const GRADE3_SEM2_SUBJECTS = [
  'اللغة العربية',
  'التربية الفنية',
  'المهارات الحياتية والأسرية',
  'الرياضيات',
  'العلوم',
  'التربية البدنية والدفاع عن النفس',
  'اللغة الإنجليزية',
  'القرآن الكريم والدراسات الإسلامية',
  'القرآن الكريم - مدارس التحفيظ',
  'القرآن الكريم - مدارس المناهج المقارنة',
];

// ── Helper: assign a list of subjects to a grade's semester ──
async function assignSubjects(gradeId, semesterId, gradeName, semesterName, subjectNames) {
  console.log(`\n📚 ${gradeName} / ${semesterName}  (${subjectNames.length} مادة)`);

  for (const subjectName of subjectNames) {
    // Find or create subject
    let subject = await prisma.subject.findFirst({ where: { name: subjectName } });
    if (!subject) {
      subject = await prisma.subject.create({ data: { name: subjectName } });
      console.log(`  ➕ أُنشئت مادة جديدة: ${subjectName}`);
    }

    // Check if already assigned
    const exists = await prisma.gradeSubject.findFirst({
      where: { gradeId, semesterId, subjectId: subject.id }
    });

    if (exists) {
      console.log(`  ✅ موجودة: ${subjectName}`);
    } else {
      await prisma.gradeSubject.create({
        data: { gradeId, semesterId, subjectId: subject.id }
      });
      console.log(`  ➕ أُضيفت: ${subjectName}`);
    }
  }
}

async function main() {
  // Load all elementary grades with their semesters
  const grades = await prisma.grade.findMany({
    where: {
      name: {
        in: [
          'الصف الأول الابتدائي',
          'الصف الثاني الابتدائي',
          'الصف الثالث الابتدائي',
        ]
      }
    },
    include: {
      semesters: { orderBy: { order: 'asc' } }
    }
  });

  console.log('\nالصفوف الموجودة:');
  grades.forEach(g => console.log(`  ${g.name} — ${g.semesters.length} فصل`));

  // ── GRADE 1: fix semester 2 missing subjects ──
  const grade1 = grades.find(g => g.name === 'الصف الأول الابتدائي');
  if (grade1) {
    const sem1 = grade1.semesters[0];
    const sem2 = grade1.semesters[1];

    if (!sem1) {
      console.log('\n⚠️  الصف الأول: لا يوجد فصل أول!');
    } else if (!sem2) {
      // Create semester 2 if it doesn't exist
      console.log('\n📅 إنشاء الفصل الثاني للصف الأول...');
      const newSem2 = await prisma.semester.create({
        data: { gradeId: grade1.id, name: 'الفصل الدراسي الثاني', order: 2 }
      });
      grade1.semesters.push(newSem2);
    }

    if (sem1) {
      // Get subjects from sem1 and copy to sem2
      const sem1Subjects = await prisma.gradeSubject.findMany({
        where: { gradeId: grade1.id, semesterId: sem1.id },
        include: { subject: true }
      });
      const sem1SubjectNames = sem1Subjects.map(gs => gs.subject.name);
      const grade1Sem2 = grade1.semesters[1] ?? (await prisma.semester.findFirst({ where: { gradeId: grade1.id, order: 2 } }));

      if (grade1Sem2) {
        await assignSubjects(grade1.id, grade1Sem2.id, 'الصف الأول الابتدائي', 'الفصل الثاني', sem1SubjectNames);
      }
    }
  } else {
    console.log('\n⚠️  الصف الأول الابتدائي غير موجود في قاعدة البيانات!');
  }

  // ── GRADE 2: both semesters — ensure semesters exist ──
  let grade2 = grades.find(g => g.name === 'الصف الثاني الابتدائي');
  if (!grade2) {
    console.log('\n⚠️  الصف الثاني الابتدائي غير موجود — ابحث يدوياً عن الاسم الصحيح');
    const allGrades = await prisma.grade.findMany({ select: { id: true, name: true } });
    console.log('الصفوف في قاعدة البيانات:');
    allGrades.forEach(g => console.log('  - ' + g.name));
  } else {
    // Ensure both semesters exist
    let g2sem1 = grade2.semesters.find(s => s.order === 1) ?? await prisma.semester.findFirst({ where: { gradeId: grade2.id, order: 1 } });
    let g2sem2 = grade2.semesters.find(s => s.order === 2) ?? await prisma.semester.findFirst({ where: { gradeId: grade2.id, order: 2 } });

    if (!g2sem1) {
      g2sem1 = await prisma.semester.create({ data: { gradeId: grade2.id, name: 'الفصل الدراسي الأول', order: 1 } });
      console.log('  📅 أُنشئ الفصل الأول لصف 2');
    }
    if (!g2sem2) {
      g2sem2 = await prisma.semester.create({ data: { gradeId: grade2.id, name: 'الفصل الدراسي الثاني', order: 2 } });
      console.log('  📅 أُنشئ الفصل الثاني لصف 2');
    }

    await assignSubjects(grade2.id, g2sem1.id, 'الصف الثاني الابتدائي', 'الفصل الأول', GRADE2_SUBJECTS);
    await assignSubjects(grade2.id, g2sem2.id, 'الصف الثاني الابتدائي', 'الفصل الثاني', GRADE2_SUBJECTS);
  }

  // ── GRADE 3: sem1 has 9 subjects, sem2 has 10 ──
  let grade3 = grades.find(g => g.name === 'الصف الثالث الابتدائي');
  if (!grade3) {
    console.log('\n⚠️  الصف الثالث الابتدائي غير موجود — تحقق من الاسم');
  } else {
    let g3sem1 = grade3.semesters.find(s => s.order === 1) ?? await prisma.semester.findFirst({ where: { gradeId: grade3.id, order: 1 } });
    let g3sem2 = grade3.semesters.find(s => s.order === 2) ?? await prisma.semester.findFirst({ where: { gradeId: grade3.id, order: 2 } });

    if (!g3sem1) {
      g3sem1 = await prisma.semester.create({ data: { gradeId: grade3.id, name: 'الفصل الدراسي الأول', order: 1 } });
      console.log('  📅 أُنشئ الفصل الأول لصف 3');
    }
    if (!g3sem2) {
      g3sem2 = await prisma.semester.create({ data: { gradeId: grade3.id, name: 'الفصل الدراسي الثاني', order: 2 } });
      console.log('  📅 أُنشئ الفصل الثاني لصف 3');
    }

    await assignSubjects(grade3.id, g3sem1.id, 'الصف الثالث الابتدائي', 'الفصل الأول', GRADE3_SEM1_SUBJECTS);
    await assignSubjects(grade3.id, g3sem2.id, 'الصف الثالث الابتدائي', 'الفصل الثاني', GRADE3_SEM2_SUBJECTS);
  }

  console.log('\n\n🎉 انتهت العملية بنجاح!');
}

main()
  .catch(e => { console.error('\n❌ خطأ:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
