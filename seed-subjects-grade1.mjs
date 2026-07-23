import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 جاري إضافة مواد الصف الأول الابتدائي...');

  // Find Grade 1
  const grade1 = await prisma.grade.findFirst({
    where: { name: 'الصف الأول الابتدائي' }
  });

  if (!grade1) {
    throw new Error('Grade 1 not found');
  }

  // Find semesters for Grade 1
  const semesters = await prisma.semester.findMany({
    where: { gradeId: grade1.id }
  });
  
  const sem1 = semesters.find(s => s.name === 'الفصل الدراسي الأول');
  const sem2 = semesters.find(s => s.name === 'الفصل الدراسي الثاني');

  if (!sem1 || !sem2) {
    throw new Error('Semesters not found');
  }

  const sem1Subjects = [
    'اللغة العربية',
    'الرياضيات',
    'العلوم',
    'التربية الفنية',
    'المهارات الحياتية والأسرية',
    'التربية البدنية والدفاع عن النفس',
    'اللغة الإنجليزية',
    'القرآن الكريم والدراسات الإسلامية',
    'الفنون البصرية',
    'الفنون الموسيقية',
    'الفنون الأدائية',
    'القران الكريم عام',
    'القران الكريم مدارس التحفيظ'
  ];

  const sem2Subjects = [
    'اللغة العربية',
    'الرياضيات',
    'العلوم',
    'التربية الفنية',
    'المهارات الحياتية والأسرية',
    'التربية البدنية والدفاع عن النفس',
    'اللغة الإنجليزية',
    'القرآن الكريم والدراسات الإسلامية',
    'الفنون البصرية',
    'الفنون الموسيقية',
    'الفنون الأدائية',
    'القران الكريم - مدارس المناهج المغايرة',
    'القران الكريم والدراسات الاسلامية - مدارس التحفيظ'
  ];

  // Helper function
  async function seedSubjectsForSemester(semesterId, subjects) {
    for (const subName of subjects) {
      // Create or find the subject
      let subject = await prisma.subject.findUnique({
        where: { name: subName }
      });
      if (!subject) {
        subject = await prisma.subject.create({
          data: { name: subName }
        });
      }

      // Link to grade and semester
      await prisma.gradeSubject.upsert({
        where: {
          gradeId_semesterId_subjectId: {
            gradeId: grade1.id,
            semesterId: semesterId,
            subjectId: subject.id
          }
        },
        update: {},
        create: {
          gradeId: grade1.id,
          semesterId: semesterId,
          subjectId: subject.id
        }
      });
    }
  }

  console.log('إضافة مواد الفصل الدراسي الأول...');
  await seedSubjectsForSemester(sem1.id, sem1Subjects);

  console.log('إضافة مواد الفصل الدراسي الثاني...');
  await seedSubjectsForSemester(sem2.id, sem2Subjects);

  console.log('✅ تم إضافة المواد بنجاح!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
