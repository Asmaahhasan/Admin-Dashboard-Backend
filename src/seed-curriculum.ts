import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();
const baseUrl = process.env.BASE_URL || 'http://localhost:4001';

async function main() {
  console.log('🧹 Cleaning old curriculum data...');

  // Delete in order to avoid foreign key violations
  await prisma.lessonActivityItem.deleteMany({});
  await prisma.lessonActivity.deleteMany({});
  await prisma.syllabusWeek.deleteMany({});
  await prisma.gradeSubject.deleteMany({});
  await prisma.grade.deleteMany({});
  await prisma.track.deleteMany({});
  await prisma.educationStage.deleteMany({});
  await prisma.semester.deleteMany({});
  await prisma.subject.deleteMany({});

  console.log('✅ Base tables cleaned.');

  // Semesters will now be seeded per-grade

  // 2. Seed Subjects
  console.log('🌱 Seeding Subjects...');
  const subjectsData = [
    'الرياضيات',
    'العلوم',
    'اللغة الإنجليزية',
    'لغتي الجميلة',
    'الدراسات الإسلامية',
    'الدراسات الاجتماعية',
    'المهارات الحياتية والأسرية',
    'التربية الفنية',
    'التربية البدنية والدفاع عن النفس',
    'المهارات الرقمية',
    'التفكير الناقد',
    'الفيزياء',
    'الكيمياء',
    'الأحياء',
    'علم البيئة',
    'التقنية الرقمية',
    'الكفايات اللغوية',
  ];
  const subjects = [];
  for (const name of subjectsData) {
    const sub = await prisma.subject.create({ data: { name } });
    subjects.push(sub);
  }

  // Helper function to create stage, default track, and grades
  async function createStageWithSingleTrack(stageName: string, order: number, gradeNames: string[]) {
    const stage = await prisma.educationStage.create({
      data: { name: stageName, order }
    });

    const track = await prisma.track.create({
      data: {
        stageId: stage.id,
        name: 'عام',
        order: 1
      }
    });

    const grades = [];
    for (let i = 0; i < gradeNames.length; i++) {
      const g = await prisma.grade.create({
        data: {
          trackId: track.id,
          name: gradeNames[i],
          order: i + 1
        }
      });
      // Add Semesters for this grade
      await prisma.semester.createMany({
        data: [
          { gradeId: g.id, name: 'الفصل الدراسي الأول', order: 1 },
          { gradeId: g.id, name: 'الفصل الدراسي الثاني', order: 2 },
          { gradeId: g.id, name: 'الفصل الدراسي الثالث', order: 3 }
        ]
      });
      grades.push(g);
    }
    return { stage, track, grades };
  }

  // 3. Seed "المرحلة الابتدائية" (No tracks)
  console.log('🌱 Seeding المرحلة الابتدائية...');
  const primary = await createStageWithSingleTrack('المرحلة الابتدائية', 1, [
    'الصف الأول الابتدائي',
    'الصف الثاني الابتدائي',
    'الصف الثالث الابتدائي',
    'الصف الرابع الابتدائي',
    'الصف الخامس الابتدائي',
    'الصف السادس الابتدائي',
  ]);

  // 4. Seed "المرحلة المتوسطة" (No tracks)
  console.log('🌱 Seeding المرحلة المتوسطة...');
  const intermediate = await createStageWithSingleTrack('المرحلة المتوسطة', 2, [
    'الصف الأول المتوسط',
    'الصف الثاني المتوسط',
    'الصف الثالث المتوسط',
  ]);

  // 5. Seed "التعليم المستمر" (No tracks)
  console.log('🌱 Seeding التعليم المستمر...');
  const basicEd = await createStageWithSingleTrack('التعليم المستمر', 4, [
    'الصف الأول',
    'الصف الثاني',
    'الصف الثالث',
  ]);

  // 6. Seed "التربية الخاصة" (No tracks)
  console.log('🌱 Seeding التربية الخاصة...');
  const specialEd = await createStageWithSingleTrack('التربية الخاصة', 5, [
    'المرحلة الابتدائية',
    'المرحلة المتوسطة',
    'المرحلة التأهيلية',
  ]);

  // 7. Seed "الثانوية العامة" (With tracks)
  console.log('🌱 Seeding الثانوية العامة...');
  const secondaryStage = await prisma.educationStage.create({
    data: { name: 'الثانوية العامة', order: 3 }
  });

  // Tracks for Secondary
  const secondaryTracksData = [
    { name: 'السنة الأولى مشتركة', order: 1, grades: ['السنة الأولى المشتركة'] },
    { name: 'مسار عام', order: 2, grades: ['السنة الثانية', 'السنة الثالثة'] },
    { name: 'مسار علوم الحاسب والهندسة', order: 3, grades: ['السنة الثانية', 'السنة الثالثة'] },
    { name: 'مسار الصحة والحياة', order: 4, grades: ['السنة الثانية', 'السنة الثالثة'] },
    { name: 'مسار إدارة الأعمال', order: 5, grades: ['السنة الثانية', 'السنة الثالثة'] },
    { name: 'المسار الشرعي', order: 6, grades: ['السنة الثانية', 'السنة الثالثة'] },
  ];

  for (const trackInfo of secondaryTracksData) {
    const track = await prisma.track.create({
      data: {
        stageId: secondaryStage.id,
        name: trackInfo.name,
        order: trackInfo.order
      }
    });

    for (let i = 0; i < trackInfo.grades.length; i++) {
      const g = await prisma.grade.create({
        data: {
          trackId: track.id,
          name: trackInfo.grades[i],
          order: i + 1
        }
      });
      await prisma.semester.createMany({
        data: [
          { gradeId: g.id, name: 'الفصل الدراسي الأول', order: 1 },
          { gradeId: g.id, name: 'الفصل الدراسي الثاني', order: 2 },
          { gradeId: g.id, name: 'الفصل الدراسي الثالث', order: 3 }
        ]
      });
    }
  }

  // 8. Link GradeSubjects and seed sample syllabus weeks and activities
  console.log('🌱 Creating GradeSubjects and sample data...');
  // Let's take "الصف الثالث الابتدائي" from primary stage, "الفصل الدراسي الأول", "الرياضيات"
  const grade3 = primary.grades.find(g => g.name === 'الصف الثالث الابتدائي');
  const grade3Semesters = grade3 ? await prisma.semester.findMany({ where: { gradeId: grade3.id } }) : [];
  const sem1 = grade3Semesters.find(s => s.name === 'الفصل الدراسي الأول');
  const math = subjects.find(s => s.name === 'الرياضيات');

  if (grade3 && sem1 && math) {
    const gs = await prisma.gradeSubject.create({
      data: {
        gradeId: grade3.id,
        semesterId: sem1.id,
        subjectId: math.id
      }
    });

    // Create admin if not exists, or get any admin
    let admin = await prisma.admin.findFirst();
    if (!admin) {
      // Seed user and admin
      const email = 'admin@madrasati.sa';
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          passwordHash: '$2b$10$wB4z.eM0Cgh2I6/P6vIisugrMv6T/1p011kQ1c.e3B/5Vj.94.Qo.', // admin123456
          role: 'ADMIN',
        }
      });
      admin = await prisma.admin.create({
        data: {
          userId: user.id,
          fullName: 'مدير النظام',
          email,
          permissions: ['ALL']
        }
      });
    }

    // Seed 4 weeks of syllabus
    const weeksData = [
      { num: 1, title: 'التهيئة والجمع ضمن العدد 10' },
      { num: 2, title: 'طرح الأعداد المكونة من رقمين' },
      { num: 3, title: 'الضرب في عدد من رقم واحد' },
      { num: 4, title: 'القسمة وعلاقتها بالضرب' }
    ];

    for (const w of weeksData) {
      const syllabusWeek = await prisma.syllabusWeek.create({
        data: {
          gradeSubjectId: gs.id,
          weekNumber: w.num,
          title: w.title,
          uploadedById: admin.id,
          weekDays: {
            create: [
              { dayOfWeek: 'الأحد', type: 'LESSON', order: 0 },
              { dayOfWeek: 'الاثنين', type: 'LESSON', order: 1 },
              { dayOfWeek: 'الثلاثاء', type: 'LESSON', order: 2 },
              { dayOfWeek: 'الأربعاء', type: 'LESSON', order: 3 },
              { dayOfWeek: 'الخميس', type: 'LESSON', order: 4 },
            ]
          }
        }
      });

      // Seed mock activities for this week
      const activity = await prisma.lessonActivity.create({
        data: {
          gradeSubjectId: gs.id,
          syllabusWeekId: syllabusWeek.id,
          lessonTitle: w.title
        }
      });

      // Seed items for this activity
      await prisma.lessonActivityItem.create({
        data: {
          lessonActivityId: activity.id,
          type: 'GAME',
          title: `لعبة تفاعلية - جزء ${w.num}`,
          url: 'https://wordwall.net/play/1234/567'
        }
      });

      await prisma.lessonActivityItem.create({
        data: {
          lessonActivityId: activity.id,
          type: 'PRESENTATION',
          title: `عرض بوربوينت لدرس ${w.title}`,
          url: `${baseUrl}/uploads/sample-math-pres.pptx`
        }
      });
    }
  }

  console.log('🎉 Database curriculum seeded successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
