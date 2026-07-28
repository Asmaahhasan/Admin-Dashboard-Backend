import { PrismaClient, Region, WeekType, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting complete seed for madrasati_local database...');

  // 1. Admin User Setup
  const hashedPassword = await bcrypt.hash('admin123456', 10);

  let user = await prisma.user.findFirst({ where: { email: 'admin@wsylh.com' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'admin@wsylh.com',
        passwordHash: hashedPassword,
        role: Role.ADMIN,
      },
    });
  }

  let admin = await prisma.admin.findFirst({ where: { userId: user.id } });
  if (!admin) {
    admin = await prisma.admin.create({
      data: {
        userId: user.id,
        fullName: 'إدارة منصة وسيلة',
        email: 'admin@wsylh.com',
        permissions: ['ALL'],
      },
    });
  }

  // 2. Education Stages Setup
  const stagesData = [
    { name: 'المرحلة الابتدائية', order: 1 },
    { name: 'المرحلة المتوسطة', order: 2 },
    { name: 'المرحلة الثانوية', order: 3 },
  ];

  const createdStages: Record<string, string> = {};
  for (const s of stagesData) {
    const stage = await prisma.educationStage.upsert({
      where: { name: s.name },
      update: { order: s.order },
      create: { name: s.name, order: s.order },
    });
    createdStages[s.name] = stage.id;
  }

  // 3. Tracks Setup for Secondary Stage
  const secondaryStageId = createdStages['المرحلة الثانوية'];
  const tracksData = [
    { name: 'المسار العام', order: 1 },
    { name: 'مسار إدارة الأعمال', order: 2 },
    { name: 'مسار علوم الحاسب والهندسة', order: 3 },
    { name: 'مسار الصحة والحياة', order: 4 },
    { name: 'المسار الشرعي', order: 5 },
  ];

  const createdTracks: Record<string, string> = {};
  if (secondaryStageId) {
    for (const t of tracksData) {
      const track = await prisma.track.upsert({
        where: { stageId_name: { stageId: secondaryStageId, name: t.name } },
        update: { order: t.order },
        create: { stageId: secondaryStageId, name: t.name, order: t.order },
      });
      createdTracks[t.name] = track.id;
    }
  }

  // General default track for non-track stages
  const primaryStageId = createdStages['المرحلة الابتدائية'];
  const middleStageId = createdStages['المرحلة المتوسطة'];

  const primaryTrack = await prisma.track.upsert({
    where: { stageId_name: { stageId: primaryStageId, name: 'عام' } },
    update: {},
    create: { stageId: primaryStageId, name: 'عام', order: 1 },
  });

  const middleTrack = await prisma.track.upsert({
    where: { stageId_name: { stageId: middleStageId, name: 'عام' } },
    update: {},
    create: { stageId: middleStageId, name: 'عام', order: 1 },
  });

  // 4. Grades Setup
  const gradesData = [
    // Primary
    { trackId: primaryTrack.id, name: 'الصف الأول الابتدائي', order: 1 },
    { trackId: primaryTrack.id, name: 'الصف الثاني الابتدائي', order: 2 },
    { trackId: primaryTrack.id, name: 'الصف الثالث الابتدائي', order: 3 },
    { trackId: primaryTrack.id, name: 'الصف الرابع الابتدائي', order: 4 },
    { trackId: primaryTrack.id, name: 'الصف الخامس الابتدائي', order: 5 },
    { trackId: primaryTrack.id, name: 'الصف السادس الابتدائي', order: 6 },
    // Middle
    { trackId: middleTrack.id, name: 'الصف الأول المتوسط', order: 1 },
    { trackId: middleTrack.id, name: 'الصف الثاني المتوسط', order: 2 },
    { trackId: middleTrack.id, name: 'الصف الثالث المتوسط', order: 3 },
  ];

  // Add Secondary Grades for General Track
  if (createdTracks['المسار العام']) {
    const generalTrackId = createdTracks['المسار العام'];
    gradesData.push(
      { trackId: generalTrackId, name: 'السنة الأولى المشتركة', order: 1 },
      { trackId: generalTrackId, name: 'الصف الثاني ثانوي - المسار العام', order: 2 },
      { trackId: generalTrackId, name: 'الصف الثالث ثانوي - المسار العام', order: 3 }
    );
  }

  const createdGrades: Record<string, string> = {};
  for (const g of gradesData) {
    const grade = await prisma.grade.upsert({
      where: { trackId_name: { trackId: g.trackId, name: g.name } },
      update: { order: g.order },
      create: { trackId: g.trackId, name: g.name, order: g.order },
    });
    createdGrades[g.name] = grade.id;
  }

  // 5. Semesters Setup
  const semesterNames = ['الفصل الدراسي الأول', 'الفصل الدراسي الثاني', 'الفصل الدراسي الثالث'];
  const createdSemesters: Record<string, string[]> = {};

  for (const [gradeName, gradeId] of Object.entries(createdGrades)) {
    createdSemesters[gradeName] = [];
    for (let i = 0; i < semesterNames.length; i++) {
      const semName = semesterNames[i];
      const sem = await prisma.semester.upsert({
        where: { gradeId_name: { gradeId, name: semName } },
        update: { order: i + 1 },
        create: { gradeId, name: semName, order: i + 1 },
      });
      createdSemesters[gradeName].push(sem.id);
    }
  }

  // 6. Subjects Setup
  const subjectsData = [
    'القرآن الكريم والدراسات الإسلامية',
    'اللغة العربية (لغتي)',
    'الرياضيات',
    'العلوم',
    'الدراسات الاجتماعية',
    'التربية الفنية',
    'التربية البدنية والدفاع عن النفس',
    'اللغة الإنجليزية',
    'المهارات الرقمية',
    'التفكير الناقد',
    'التقنية الرقمية',
  ];

  const createdSubjects: Record<string, string> = {};
  for (const subName of subjectsData) {
    const subject = await prisma.subject.upsert({
      where: { name: subName },
      update: {},
      create: { name: subName },
    });
    createdSubjects[subName] = subject.id;
  }

  // 7. Link Subjects to Grades & Semesters (GradeSubjects)
  const firstGradeId = createdGrades['الصف الأول الابتدائي'];
  const firstSemId = createdSemesters['الصف الأول الابتدائي']?.[0];
  const artSubjectId = createdSubjects['التربية الفنية'];

  let primaryGradeSubjectId = '';

  if (firstGradeId && firstSemId && artSubjectId) {
    const gs = await prisma.gradeSubject.upsert({
      where: {
        gradeId_semesterId_subjectId: {
          gradeId: firstGradeId,
          semesterId: firstSemId,
          subjectId: artSubjectId,
        },
      },
      update: {},
      create: {
        gradeId: firstGradeId,
        semesterId: firstSemId,
        subjectId: artSubjectId,
      },
    });
    primaryGradeSubjectId = gs.id;
  }

  // Link all subjects to 1st grade 1st semester as well for rich testing
  for (const subName of subjectsData) {
    const subId = createdSubjects[subName];
    if (firstGradeId && firstSemId && subId) {
      await prisma.gradeSubject.upsert({
        where: {
          gradeId_semesterId_subjectId: {
            gradeId: firstGradeId,
            semesterId: firstSemId,
            subjectId: subId,
          },
        },
        update: {},
        create: {
          gradeId: firstGradeId,
          semesterId: firstSemId,
          subjectId: subId,
        },
      });
    }
  }

  // 8. Seed Academic Calendar Days
  const daysToSeed: Array<{ date: Date; dayName: string; type: WeekType; region: Region; note: string }> = [
    // GENERAL
    { date: new Date('2025-09-23T00:00:00.000Z'), dayName: 'الثلاثاء', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة اليوم الوطني السعودي' },
    { date: new Date('2026-03-28T00:00:00.000Z'), dayName: 'السبت', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة عيد الفطر المبارك' },
    { date: new Date('2026-03-29T00:00:00.000Z'), dayName: 'الأحد', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة عيد الفطر المبارك' },
    { date: new Date('2026-03-30T00:00:00.000Z'), dayName: 'الاثنين', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة عيد الفطر المبارك' },
    { date: new Date('2026-03-31T00:00:00.000Z'), dayName: 'الثلاثاء', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة عيد الفطر المبارك' },
    { date: new Date('2026-04-01T00:00:00.000Z'), dayName: 'الأربعاء', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة عيد الفطر المبارك' },
    { date: new Date('2026-06-05T00:00:00.000Z'), dayName: 'الجمعة', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة عيد الأضحى المبارك' },
    { date: new Date('2026-06-06T00:00:00.000Z'), dayName: 'السبت', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة عيد الأضحى المبارك' },
    { date: new Date('2026-06-07T00:00:00.000Z'), dayName: 'الأحد', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة عيد الأضحى المبارك' },
    { date: new Date('2026-06-08T00:00:00.000Z'), dayName: 'الاثنين', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة عيد الأضحى المبارك' },
    { date: new Date('2026-06-09T00:00:00.000Z'), dayName: 'الثلاثاء', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة عيد الأضحى المبارك' },
    { date: new Date('2026-09-23T00:00:00.000Z'), dayName: 'الأربعاء', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة اليوم الوطني السعودي' },
    { date: new Date('2025-11-09T00:00:00.000Z'), dayName: 'الأحد', type: WeekType.EXAM, region: Region.GENERAL, note: 'بداية اختبارات منتصف الفصل الأول' },
    { date: new Date('2025-11-10T00:00:00.000Z'), dayName: 'الاثنين', type: WeekType.EXAM, region: Region.GENERAL, note: 'اختبارات منتصف الفصل الأول' },
    { date: new Date('2025-11-11T00:00:00.000Z'), dayName: 'الثلاثاء', type: WeekType.EXAM, region: Region.GENERAL, note: 'اختبارات منتصف الفصل الأول' },
    { date: new Date('2025-11-12T00:00:00.000Z'), dayName: 'الأربعاء', type: WeekType.EXAM, region: Region.GENERAL, note: 'اختبارات منتصف الفصل الأول' },
    { date: new Date('2025-11-13T00:00:00.000Z'), dayName: 'الخميس', type: WeekType.EXAM, region: Region.GENERAL, note: 'اختبارات منتصف الفصل الأول' },
    { date: new Date('2025-11-16T00:00:00.000Z'), dayName: 'الأحد', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة منتصف الفصل الأول' },
    { date: new Date('2025-11-17T00:00:00.000Z'), dayName: 'الاثنين', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة منتصف الفصل الأول' },
    { date: new Date('2025-11-18T00:00:00.000Z'), dayName: 'الثلاثاء', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة منتصف الفصل الأول' },
    { date: new Date('2025-11-19T00:00:00.000Z'), dayName: 'الأربعاء', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة منتصف الفصل الأول' },
    { date: new Date('2025-11-20T00:00:00.000Z'), dayName: 'الخميس', type: WeekType.HOLIDAY, region: Region.GENERAL, note: 'إجازة منتصف الفصل الأول' },

    // MAKKAH
    { date: new Date('2026-06-01T00:00:00.000Z'), dayName: 'الاثنين', type: WeekType.HOLIDAY, region: Region.MAKKAH, note: 'إجازة موسم الحج (مكة المكرمة)' },
    { date: new Date('2026-06-02T00:00:00.000Z'), dayName: 'الثلاثاء', type: WeekType.HOLIDAY, region: Region.MAKKAH, note: 'إجازة موسم الحج (مكة المكرمة)' },
    { date: new Date('2026-06-03T00:00:00.000Z'), dayName: 'الأربعاء', type: WeekType.HOLIDAY, region: Region.MAKKAH, note: 'يوم عرفة (إجازة مكة المكرمة)' },
    { date: new Date('2026-06-04T00:00:00.000Z'), dayName: 'الخميس', type: WeekType.HOLIDAY, region: Region.MAKKAH, note: 'أول أيام عيد الأضحى (مكة المكرمة)' },
    { date: new Date('2025-10-15T00:00:00.000Z'), dayName: 'الأربعاء', type: WeekType.HOLIDAY, region: Region.MAKKAH, note: 'إجازة محلية - مكة المكرمة' },

    // JEDDAH
    { date: new Date('2026-01-11T00:00:00.000Z'), dayName: 'الأحد', type: WeekType.HOLIDAY, region: Region.JEDDAH, note: 'إجازة طارئة - أمطار غزيرة (جدة)' },
    { date: new Date('2025-10-20T00:00:00.000Z'), dayName: 'الاثنين', type: WeekType.HOLIDAY, region: Region.JEDDAH, note: 'إجازة محلية - محافظة جدة' },
    { date: new Date('2026-02-05T00:00:00.000Z'), dayName: 'الخميس', type: WeekType.HOLIDAY, region: Region.JEDDAH, note: 'إجازة محلية - محافظة جدة' },

    // TAIF
    { date: new Date('2026-04-10T00:00:00.000Z'), dayName: 'الجمعة', type: WeekType.HOLIDAY, region: Region.TAIF, note: 'إجازة موسم ورد الطائف' },
    { date: new Date('2025-10-08T00:00:00.000Z'), dayName: 'الأربعاء', type: WeekType.HOLIDAY, region: Region.TAIF, note: 'إجازة محلية - محافظة الطائف' },
    { date: new Date('2026-03-15T00:00:00.000Z'), dayName: 'الأحد', type: WeekType.HOLIDAY, region: Region.TAIF, note: 'إجازة محلية - محافظة الطائف' },
  ];

  let calendarCount = 0;
  for (const day of daysToSeed) {
    await prisma.calendarDay.upsert({
      where: {
        date_region: {
          date: day.date,
          region: day.region,
        },
      },
      update: day,
      create: day,
    });
    calendarCount++;
  }
  console.log(`✅ Academic Calendar seeded: ${calendarCount} days!`);

  // 9. Seed Syllabus Weeks for Art Subject
  if (primaryGradeSubjectId && admin) {
    const ART_WEEKS = [
      { weekNumber: 1, title: 'مجال الرسم - الألوان ممتعة / التهيئة', startDateHijri: 'من 3-2 إلى 14-3-1448 هـ', endDateHijri: 'من 23-8 إلى 27-8-2026 م', isHoliday: false },
      { weekNumber: 2, title: 'مجال الرسم - الألوان ممتعة', startDateHijri: 'من 17-3 إلى 21-3-1448 هـ', endDateHijri: 'من 30-8 إلى 3-9-2026 م', isHoliday: false },
      { weekNumber: 3, title: 'مجال الرسم - مجموعة الألوان', startDateHijri: 'من 24-3 إلى 28-3-1448 هـ', endDateHijri: 'من 6-9 إلى 10-9-2026 م', isHoliday: false },
      { weekNumber: 4, title: 'مجال الرسم - الإنسان والرسم', startDateHijri: 'من 2-4 إلى 6-4-1448 هـ', endDateHijri: 'من 13-9 إلى 17-9-2026 م', isHoliday: false },
      { weekNumber: 5, title: '🌴 إجازة اليوم الوطني (23 سبتمبر) | مجال الرسم - الإنسان والرسم | مراجعة | مجال الرسم - مدرستي الجميلة', startDateHijri: 'من 9-4 إلى 13-4-1448 هـ', endDateHijri: 'من 20-9 إلى 24-9-2026 م', isHoliday: false },
      { weekNumber: 6, title: 'مجال الرسم - مدرستي الجميلة | مجال الزخرفة - أزخرف بالمربع والمستطيل', startDateHijri: 'من 16-4 إلى 20-4-1448 هـ', endDateHijri: 'من 27-9 إلى 1-10-2026 م', isHoliday: false },
      { weekNumber: 7, title: 'مجال الزخرفة - أزخرف بالمربع والمستطيل | مجال الزخرفة - الزخرفة بالدائرة والمثلث', startDateHijri: 'من 23-4 إلى 27-4-1448 هـ', endDateHijri: 'من 4-10 إلى 8-10-2026 م', isHoliday: false },
      { weekNumber: 8, title: 'مراجعة', startDateHijri: 'من 30-4 إلى 4-5-1448 هـ', endDateHijri: 'من 11-10 إلى 15-10-2026 م', isHoliday: false },
      { weekNumber: 9, title: 'مجال الزخرفة - الزخرفة بالدائرة والمثلث | مجال الطباعة - أطبع أشكالاً من الطبيعة', startDateHijri: 'من 7-5 إلى 11-5-1448 هـ', endDateHijri: 'من 18-10 إلى 22-10-2026 م', isHoliday: false },
      { weekNumber: 10, title: 'مجال الطباعة - أطبع أشكالاً من الطبيعة | مجال الطباعة - أطبع أشكالاً بأدواتي', startDateHijri: 'من 14-5 إلى 18-5-1448 هـ', endDateHijri: 'من 25-10 إلى 29-10-2026 م', isHoliday: false },
      { weekNumber: 11, title: 'مجال الطباعة - أطبع أشكالاً بأدواتي | مراجعة', startDateHijri: 'من 21-5 إلى 25-5-1448 هـ', endDateHijri: 'من 1-11 إلى 5-11-2026 م', isHoliday: false },
      { weekNumber: 12, title: 'مجال التشكيل المسطح والمجسم - التشكيل بالطين', startDateHijri: 'من 28-5 إلى 2-6-1448 هـ', endDateHijri: 'من 8-11 إلى 12-11-2026 م', isHoliday: false },
      { weekNumber: 13, title: 'مجال التشكيل المسطح والمجسم - التشكيل بالطين | مجال التشكيل المسطح والمجسم - أحفورتي الصغيرة', startDateHijri: 'من 5-6 إلى 9-6-1448 هـ', endDateHijri: 'من 15-11 إلى 19-11-2026 م', isHoliday: false },
      { weekNumber: 14, title: '🌴 إجازة الخريف', startDateHijri: 'من 12-6 إلى 18-6-1448 هـ', endDateHijri: 'من 22-11 إلى 28-11-2026 م', isHoliday: true },
      { weekNumber: 15, title: 'مجال التشكيل المسطح والمجسم - أحفورتي الصغيرة | مجال التشكيل المسطح والمجسم - أسماكي المخططة', startDateHijri: 'من 19-6 إلى 23-6-1448 هـ', endDateHijri: 'من 29-11 إلى 3-12-2026 م', isHoliday: false },
      { weekNumber: 16, title: 'مجال التشكيل المسطح والمجسم - أسماكي المخططة | مراجعة', startDateHijri: 'من 26-6 إلى 1-7-1448 هـ', endDateHijri: 'من 6-12 إلى 10-12-2026 م', isHoliday: false },
      { weekNumber: 17, title: 'مراجعة عامة', startDateHijri: 'من 4-7 إلى 8-7-1448 هـ', endDateHijri: 'من 13-12 إلى 17-12-2026 م', isHoliday: false },
      { weekNumber: 18, title: 'مراجعة عامة', startDateHijri: 'من 11-7 إلى 15-7-1448 هـ', endDateHijri: 'من 20-12 إلى 24-12-2026 م', isHoliday: false },
      { weekNumber: 19, title: '📝 اختبارات شفهية وعملية', startDateHijri: 'من 18-7 إلى 22-7-1448 هـ', endDateHijri: 'من 27-12 إلى 31-12-2026 م', isHoliday: false },
      { weekNumber: 20, title: '📝 اختبارات نهائية', startDateHijri: 'من 25-7 إلى 29-7-1448 هـ', endDateHijri: 'من 3-1 إلى 7-1-2027 م', isHoliday: false },
      { weekNumber: 21, title: '🌴 إجازة منتصف العام', startDateHijri: 'من 30-7 إلى 8-8-1448 هـ', endDateHijri: 'من 8-1 إلى 16-1-2027 م', isHoliday: true },
    ];

    await prisma.syllabusWeek.deleteMany({
      where: { gradeSubjectId: primaryGradeSubjectId },
    });

    for (const w of ART_WEEKS) {
      await prisma.syllabusWeek.create({
        data: {
          gradeSubjectId: primaryGradeSubjectId,
          weekNumber: w.weekNumber,
          title: w.title,
          startDateHijri: w.startDateHijri,
          endDateHijri: w.endDateHijri,
          weekType: w.isHoliday ? WeekType.HOLIDAY : WeekType.LESSON,
          uploadedById: admin.id,
          weekDays: {
            create: [
              { dayOfWeek: 'الأحد', type: w.isHoliday ? WeekType.HOLIDAY : WeekType.LESSON, order: 0 },
              { dayOfWeek: 'الاثنين', type: w.isHoliday ? WeekType.HOLIDAY : WeekType.LESSON, order: 1 },
              { dayOfWeek: 'الثلاثاء', type: w.isHoliday ? WeekType.HOLIDAY : WeekType.LESSON, order: 2 },
              { dayOfWeek: 'الأربعاء', type: w.isHoliday ? WeekType.HOLIDAY : WeekType.LESSON, order: 3 },
              { dayOfWeek: 'الخميس', type: w.isHoliday ? WeekType.HOLIDAY : WeekType.LESSON, order: 4 },
            ],
          },
        },
      });
    }
    console.log(`✅ Seeded ${ART_WEEKS.length} syllabus weeks for التربية الفنية!`);
  }

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
