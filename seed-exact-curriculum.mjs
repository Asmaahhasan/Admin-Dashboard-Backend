import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 تنظيف البيانات القديمة للمناهج الدراسية...');

  // Delete in order to avoid foreign key violations
  await prisma.lessonActivityItem.deleteMany({});
  await prisma.lessonActivity.deleteMany({});
  await prisma.syllabusWeek.deleteMany({});
  await prisma.gradeSubject.deleteMany({});
  await prisma.semester.deleteMany({});
  await prisma.grade.deleteMany({});
  await prisma.track.deleteMany({});
  await prisma.educationStage.deleteMany({});

  console.log('✅ تم تنظيف جداول المناهج.');

  // helper to create standard semesters
  async function createSemestersForGrade(gradeId) {
    await prisma.semester.createMany({
      data: [
        { gradeId, name: 'الفصل الدراسي الأول', order: 1 },
        { gradeId, name: 'الفصل الدراسي الثاني', order: 2 }
      ]
    });
  }

  // 1. المرحلة الابتدائية
  console.log('🌱 إدخال: المرحلة الابتدائية...');
  const primaryStage = await prisma.educationStage.create({
    data: { name: 'المرحلة الابتدائية', order: 1 }
  });
  const primaryTrack = await prisma.track.create({
    data: { stageId: primaryStage.id, name: 'عام', order: 1 }
  });
  const primaryGrades = [
    'الصف الأول الابتدائي',
    'الصف الثاني الابتدائي',
    'الصف الثالث الابتدائي',
    'الصف الرابع الابتدائي',
    'الصف الخامس الابتدائي',
    'الصف السادس الابتدائي'
  ];
  for (let i = 0; i < primaryGrades.length; i++) {
    const g = await prisma.grade.create({
      data: { trackId: primaryTrack.id, name: primaryGrades[i], order: i + 1 }
    });
    await createSemestersForGrade(g.id);
  }

  // 2. المرحلة المتوسطة
  console.log('🌱 إدخال: المرحلة المتوسطة...');
  const intermediateStage = await prisma.educationStage.create({
    data: { name: 'المرحلة المتوسطة', order: 2 }
  });
  const intermediateTrack = await prisma.track.create({
    data: { stageId: intermediateStage.id, name: 'عام', order: 1 }
  });
  const intermediateGrades = [
    'الصف الأول المتوسط',
    'الصف الثاني المتوسط',
    'الصف الثالث المتوسط'
  ];
  for (let i = 0; i < intermediateGrades.length; i++) {
    const g = await prisma.grade.create({
      data: { trackId: intermediateTrack.id, name: intermediateGrades[i], order: i + 1 }
    });
    await createSemestersForGrade(g.id);
  }

  // 3. الثانوية العامة (بالمسارات الدقيقة من الصور)
  console.log('🌱 إدخال: الثانوية العامة...');
  const secondaryStage = await prisma.educationStage.create({
    data: { name: 'الثانوية العامة', order: 3 }
  });

  const secondaryTracks = [
    { name: 'السنة الأولى المشتركة', order: 1, grades: ['السنة الأولى المشتركة'] },
    { name: 'المسار العام', order: 2, grades: ['السنة الثانية', 'السنة الثالثة'] },
    { name: 'المسار الشرعي', order: 3, grades: ['السنة الثانية', 'السنة الثالثة'] },
    { name: 'مسار إدارة الأعمال', order: 4, grades: ['السنة الثانية', 'السنة الثالثة'] },
    { name: 'مسار علوم الحاسب والهندسة', order: 5, grades: ['السنة الثانية', 'السنة الثالثة'] },
    { name: 'مسار الصحة والحياة', order: 6, grades: ['السنة الثانية', 'السنة الثالثة'] }
  ];

  for (const trackInfo of secondaryTracks) {
    const track = await prisma.track.create({
      data: { stageId: secondaryStage.id, name: trackInfo.name, order: trackInfo.order }
    });
    for (let i = 0; i < trackInfo.grades.length; i++) {
      const g = await prisma.grade.create({
        data: { trackId: track.id, name: trackInfo.grades[i], order: i + 1 }
      });
      await createSemestersForGrade(g.id);
    }
  }

  // 4. التعليم المستمر
  console.log('🌱 إدخال: التعليم المستمر...');
  const basicEdStage = await prisma.educationStage.create({
    data: { name: 'التعليم المستمر', order: 4 }
  });
  const basicEdTrack = await prisma.track.create({
    data: { stageId: basicEdStage.id, name: 'عام', order: 1 }
  });
  const basicEdGrades = [
    'الصف الأول',
    'الصف الثاني',
    'الصف الثالث'
  ];
  for (let i = 0; i < basicEdGrades.length; i++) {
    const g = await prisma.grade.create({
      data: { trackId: basicEdTrack.id, name: basicEdGrades[i], order: i + 1 }
    });
    await createSemestersForGrade(g.id);
  }

  // 5. التربية الخاصة
  console.log('🌱 إدخال: التربية الخاصة...');
  const specialEdStage = await prisma.educationStage.create({
    data: { name: 'التربية الخاصة', order: 5 }
  });
  const specialEdTrack = await prisma.track.create({
    data: { stageId: specialEdStage.id, name: 'عام', order: 1 }
  });
  const specialEdGrades = [
    'المرحلة الابتدائية',
    'المرحلة المتوسطة',
    'المرحلة التأهيلية'
  ];
  for (let i = 0; i < specialEdGrades.length; i++) {
    const g = await prisma.grade.create({
      data: { trackId: specialEdTrack.id, name: specialEdGrades[i], order: i + 1 }
    });
    await createSemestersForGrade(g.id);
  }

  console.log('\n🎉 اكتمل إدخال الهيكل الكامل وتطبيقه بنجاح على قاعدة البيانات!');
}

main()
  .catch((err) => {
    console.error('❌ خطأ أثناء الإدخال:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
