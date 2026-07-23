import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const DATA = [
  {
    stage: 'المرحلة الابتدائية',
    grade: 'الصف الثاني الابتدائي',
    semester: 'الفصل الدراسي الأول',
    order: 1,
    subjects: [
      'اللغة العربية',
      'الرياضيات',
      'العلوم',
      'التربية الفنية',
      'المهارات الحياتية والأسرية',
      'التربية البدنية والدفاع عن النفس',
      'اللغة الإنجليزية',
      'القرآن الكريم والدراسات الإسلامية',
      'القرآن الكريم عام',
      'القرآن الكريم مدارس التحفيظ'
    ]
  },
  {
    stage: 'المرحلة الابتدائية',
    grade: 'الصف الثاني الابتدائي',
    semester: 'الفصل الدراسي الثاني',
    order: 2,
    subjects: [
      'اللغة العربية',
      'الرياضيات',
      'العلوم',
      'التربية الفنية',
      'المهارات الحياتية والأسرية',
      'التربية البدنية والدفاع عن النفس',
      'اللغة الإنجليزية',
      'القرآن الكريم والدراسات الإسلامية',
      'القرآن الكريم - مدارس التحفيظ',
      'القرآن الكريم - مدارس المناهج المعايرة'
    ]
  },
  {
    stage: 'المرحلة الابتدائية',
    grade: 'الصف الثالث الابتدائي',
    semester: 'الفصل الدراسي الأول',
    order: 1,
    subjects: [
      'اللغة العربية',
      'التربية الفنية',
      'المهارات الحياتية والأسرية',
      'الرياضيات',
      'العلوم',
      'التربية البدنية والدفاع عن النفس',
      'اللغة الإنجليزية',
      'القرآن الكريم والدراسات الإسلامية',
      'القرآن الكريم عام',
      'القرآن الكريم مدارس التحفيظ'
    ]
  },
  {
    stage: 'المرحلة الابتدائية',
    grade: 'الصف الثالث الابتدائي',
    semester: 'الفصل الدراسي الثاني',
    order: 2,
    subjects: [
      'اللغة العربية',
      'التربية الفنية',
      'المهارات الحياتية والأسرية',
      'الرياضيات',
      'العلوم',
      'التربية البدنية والدفاع عن النفس',
      'اللغة الإنجليزية',
      'القرآن الكريم والدراسات الإسلامية',
      'القرآن الكريم - مدارس التحفيظ',
      'القرآن الكريم - مدارس المناهج المعايرة'
    ]
  }
];

async function main() {
  console.log('🚀 بدء إدخال البيانات المأخوذة من الصور...');

  for (const item of DATA) {
    // 1. Stage
    let stage = await prisma.educationStage.findUnique({ where: { name: item.stage } });
    if (!stage) {
      stage = await prisma.educationStage.create({ data: { name: item.stage, order: 1 } });
      console.log(`➕ تم إنشاء المرحلة: ${item.stage}`);
    }

    // 2. Track
    let track = await prisma.track.findFirst({ where: { stageId: stage.id, name: 'عام' } });
    if (!track) {
      track = await prisma.track.create({ data: { stageId: stage.id, name: 'عام', order: 1 } });
      console.log(`➕ تم إنشاء المسار العام للمرحلة: ${item.stage}`);
    }

    // 3. Grade
    let grade = await prisma.grade.findFirst({ where: { trackId: track.id, name: item.grade } });
    if (!grade) {
      grade = await prisma.grade.create({ data: { trackId: track.id, name: item.grade, order: 1 } });
      console.log(`➕ تم إنشاء الصف: ${item.grade}`);
    }

    // 4. Semester
    let semester = await prisma.semester.findFirst({ where: { gradeId: grade.id, name: item.semester } });
    if (!semester) {
      semester = await prisma.semester.create({ data: { gradeId: grade.id, name: item.semester, order: item.order } });
      console.log(`➕ تم إنشاء الفصل الدراسي: ${item.semester} لـ ${item.grade}`);
    }

    // 5. Subjects & GradeSubject Associations
    console.log(`\n📌 ربط مواد (${item.grade} - ${item.semester}):`);
    for (const subjName of item.subjects) {
      let subject = await prisma.subject.findUnique({ where: { name: subjName } });
      if (!subject) {
        subject = await prisma.subject.create({ data: { name: subjName } });
        console.log(`   ➕ إنشاء مادة جديدة: ${subjName}`);
      }

      const existingGS = await prisma.gradeSubject.findFirst({
        where: {
          gradeId: grade.id,
          semesterId: semester.id,
          subjectId: subject.id
        }
      });

      if (!existingGS) {
        await prisma.gradeSubject.create({
          data: {
            gradeId: grade.id,
            semesterId: semester.id,
            subjectId: subject.id
          }
        });
        console.log(`   ✅ تم ربط المادة: ${subjName}`);
      } else {
        console.log(`   ✔ المادة مضافة مسبقاً: ${subjName}`);
      }
    }
  }

  console.log('\n✨ اكتمل إدخال جميع البيانات بنجاح في قاعدة البيانات!');
}

main()
  .catch((err) => {
    console.error('❌ خطأ في الإدخال:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
