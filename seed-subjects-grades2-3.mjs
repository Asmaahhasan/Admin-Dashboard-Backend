import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 جاري إضافة مواد الصف الثاني والثالث الابتدائي...');

  // Helper function to seed subjects for a specific grade and semester
  async function seedSubjects(gradeName, semesterName, subjects) {
    const grade = await prisma.grade.findFirst({ where: { name: gradeName } });
    if (!grade) {
      console.warn(`Grade not found: ${gradeName}`);
      return;
    }

    const semester = await prisma.semester.findFirst({
      where: { gradeId: grade.id, name: semesterName }
    });
    if (!semester) {
      console.warn(`Semester not found: ${semesterName} in ${gradeName}`);
      return;
    }

    for (const subName of subjects) {
      let subject = await prisma.subject.findUnique({ where: { name: subName } });
      if (!subject) {
        subject = await prisma.subject.create({ data: { name: subName } });
      }

      await prisma.gradeSubject.upsert({
        where: {
          gradeId_semesterId_subjectId: {
            gradeId: grade.id,
            semesterId: semester.id,
            subjectId: subject.id
          }
        },
        update: {},
        create: {
          gradeId: grade.id,
          semesterId: semester.id,
          subjectId: subject.id
        }
      });
    }
    console.log(`تم إضافة مواد ${gradeName} - ${semesterName}`);
  }

  const grade2Subjects = [
    'اللغة العربية',
    'الرياضيات',
    'العلوم',
    'التربية الفنية',
    'المهارات الحياتية والأسرية',
    'التربية البدنية والدفاع عن النفس',
    'اللغة الإنجليزية',
    'القرآن الكريم والدراسات الإسلامية',
    'القران الكريم - مدارس التحفيظ',
    'القران الكريم - مدارس المناهج المغايرة'
  ];

  const grade3Sem1Subjects = [
    'اللغة العربية',
    'التربية الفنية',
    'المهارات الحياتية والأسرية',
    'الرياضيات',
    'العلوم',
    'التربية البدنية والدفاع عن النفس',
    'اللغة الإنجليزية',
    'القرآن الكريم والدراسات الإسلامية',
    'القران الكريم عام',
    'القران الكريم مدارس التحفيظ'
  ];

  const grade3Sem2Subjects = [
    'اللغة العربية',
    'التربية الفنية',
    'المهارات الحياتية والأسرية',
    'الرياضيات',
    'العلوم',
    'التربية البدنية والدفاع عن النفس',
    'اللغة الإنجليزية',
    'القرآن الكريم والدراسات الإسلامية',
    'القران الكريم - مدارس التحفيظ',
    'القران الكريم - مدارس المناهج المغايرة'
  ];

  await seedSubjects('الصف الثاني الابتدائي', 'الفصل الدراسي الأول', grade2Subjects);
  await seedSubjects('الصف الثاني الابتدائي', 'الفصل الدراسي الثاني', grade2Subjects);
  
  await seedSubjects('الصف الثالث الابتدائي', 'الفصل الدراسي الأول', grade3Sem1Subjects);
  await seedSubjects('الصف الثالث الابتدائي', 'الفصل الدراسي الثاني', grade3Sem2Subjects);

  console.log('✅ تم إضافة المواد بنجاح!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
