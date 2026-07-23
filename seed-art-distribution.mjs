import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ART_WEEKS = [
  {
    weekNumber: 1,
    title: 'مجال الرسم - الألوان ممتعة / التهيئة',
    startDateHijri: 'من 3-2 إلى 14-3-1448 هـ',
    endDateHijri: 'من 23-8 إلى 27-8-2026 م',
    isHoliday: false
  },
  {
    weekNumber: 2,
    title: 'مجال الرسم - الألوان ممتعة',
    startDateHijri: 'من 17-3 إلى 21-3-1448 هـ',
    endDateHijri: 'من 30-8 إلى 3-9-2026 م',
    isHoliday: false
  },
  {
    weekNumber: 3,
    title: 'مجال الرسم - مجموعة الألوان',
    startDateHijri: 'من 24-3 إلى 28-3-1448 هـ',
    endDateHijri: 'من 6-9 إلى 10-9-2026 م',
    isHoliday: false
  },
  {
    weekNumber: 4,
    title: 'مجال الرسم - الإنسان والرسم',
    startDateHijri: 'من 2-4 إلى 6-4-1448 هـ',
    endDateHijri: 'من 13-9 إلى 17-9-2026 م',
    isHoliday: false
  },
  {
    weekNumber: 5,
    title: '🌴 إجازة اليوم الوطني (23 سبتمبر) | مجال الرسم - الإنسان والرسم | مراجعة | مجال الرسم - مدرستي الجميلة',
    startDateHijri: 'من 9-4 إلى 13-4-1448 هـ',
    endDateHijri: 'من 20-9 إلى 24-9-2026 م',
    isHoliday: false
  },
  {
    weekNumber: 6,
    title: 'مجال الرسم - مدرستي الجميلة | مجال الزخرفة - أزخرف بالمربع والمستطيل',
    startDateHijri: 'من 16-4 إلى 20-4-1448 هـ',
    endDateHijri: 'من 27-9 إلى 1-10-2026 م',
    isHoliday: false
  },
  {
    weekNumber: 7,
    title: 'مجال الزخرفة - أزخرف بالمربع والمستطيل | مجال الزخرفة - الزخرفة بالدائرة والمثلث',
    startDateHijri: 'من 23-4 إلى 27-4-1448 هـ',
    endDateHijri: 'من 4-10 إلى 8-10-2026 م',
    isHoliday: false
  },
  {
    weekNumber: 8,
    title: 'مراجعة',
    startDateHijri: 'من 30-4 إلى 4-5-1448 هـ',
    endDateHijri: 'من 11-10 إلى 15-10-2026 م',
    isHoliday: false
  },
  {
    weekNumber: 9,
    title: 'مجال الزخرفة - الزخرفة بالدائرة والمثلث | مجال الطباعة - أطبع أشكالاً من الطبيعة',
    startDateHijri: 'من 7-5 إلى 11-5-1448 هـ',
    endDateHijri: 'من 18-10 إلى 22-10-2026 م',
    isHoliday: false
  },
  {
    weekNumber: 10,
    title: 'مجال الطباعة - أطبع أشكالاً من الطبيعة | مجال الطباعة - أطبع أشكالاً بأدواتي',
    startDateHijri: 'من 14-5 إلى 18-5-1448 هـ',
    endDateHijri: 'من 25-10 إلى 29-10-2026 م',
    isHoliday: false
  },
  {
    weekNumber: 11,
    title: 'مجال الطباعة - أطبع أشكالاً بأدواتي | مراجعة',
    startDateHijri: 'من 21-5 إلى 25-5-1448 هـ',
    endDateHijri: 'من 1-11 إلى 5-11-2026 م',
    isHoliday: false
  },
  {
    weekNumber: 12,
    title: 'مجال التشكيل المسطح والمجسم - التشكيل بالطين',
    startDateHijri: 'من 28-5 إلى 2-6-1448 هـ',
    endDateHijri: 'من 8-11 إلى 12-11-2026 م',
    isHoliday: false
  },
  {
    weekNumber: 13,
    title: 'مجال التشكيل المسطح والمجسم - التشكيل بالطين | مجال التشكيل المسطح والمجسم - أحفورتي الصغيرة',
    startDateHijri: 'من 5-6 إلى 9-6-1448 هـ',
    endDateHijri: 'من 15-11 إلى 19-11-2026 م',
    isHoliday: false
  },
  {
    weekNumber: 14,
    title: '🌴 إجازة الخريف',
    startDateHijri: 'من 12-6 إلى 18-6-1448 هـ',
    endDateHijri: 'من 22-11 إلى 28-11-2026 م',
    isHoliday: true,
    customHeader: 'إجازة'
  },
  {
    weekNumber: 15,
    title: 'مجال التشكيل المسطح والمجسم - أحفورتي الصغيرة | مجال التشكيل المسطح والمجسم - أسماكي المخططة',
    startDateHijri: 'من 19-6 إلى 23-6-1448 هـ',
    endDateHijri: 'من 29-11 إلى 3-12-2026 م',
    isHoliday: false,
    displayWeekNumber: 14
  },
  {
    weekNumber: 16,
    title: 'مجال التشكيل المسطح والمجسم - أسماكي المخططة | مراجعة',
    startDateHijri: 'من 26-6 إلى 1-7-1448 هـ',
    endDateHijri: 'من 6-12 إلى 10-12-2026 م',
    isHoliday: false,
    displayWeekNumber: 15
  },
  {
    weekNumber: 17,
    title: 'مراجعة عامة',
    startDateHijri: 'من 4-7 إلى 8-7-1448 هـ',
    endDateHijri: 'من 13-12 إلى 17-12-2026 م',
    isHoliday: false,
    displayWeekNumber: 16
  },
  {
    weekNumber: 18,
    title: 'مراجعة عامة',
    startDateHijri: 'من 11-7 إلى 15-7-1448 هـ',
    endDateHijri: 'من 20-12 إلى 24-12-2026 م',
    isHoliday: false,
    displayWeekNumber: 17
  },
  {
    weekNumber: 19,
    title: '📝 اختبارات شفهية وعملية',
    startDateHijri: 'من 18-7 إلى 22-7-1448 هـ',
    endDateHijri: 'من 27-12 إلى 31-12-2026 م',
    isHoliday: false,
    displayWeekNumber: 18
  },
  {
    weekNumber: 20,
    title: '📝 اختبارات نهائية',
    startDateHijri: 'من 25-7 إلى 29-7-1448 هـ',
    endDateHijri: 'من 3-1 إلى 7-1-2027 م',
    isHoliday: false,
    displayWeekNumber: 19
  },
  {
    weekNumber: 21,
    title: '🌴 إجازة منتصف العام',
    startDateHijri: 'من 30-7 إلى 8-8-1448 هـ',
    endDateHijri: 'من 8-1 إلى 16-1-2027 م',
    isHoliday: true,
    customHeader: 'إجازة'
  }
];

async function main() {
  console.log('🌱 Seed updated Syllabus Weeks with Dates & Holiday Tags...');

  let admin = await prisma.admin.findFirst();
  if (!admin) {
    let user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!user) {
      user = await prisma.user.create({
        data: { email: 'admin@wsylh.com', passwordHash: 'hashed', role: 'ADMIN' }
      });
    }
    admin = await prisma.admin.create({
      data: { userId: user.id, fullName: 'إدارة وسيلة', email: 'admin@wsylh.com' }
    });
  }

  let grade = await prisma.grade.findFirst({
    where: { name: { contains: 'الصف الأول الابتدائي' } }
  });
  let semester = await prisma.semester.findFirst({
    where: { gradeId: grade.id, name: { contains: 'الأول' } }
  });
  let subject = await prisma.subject.findFirst({
    where: { name: { contains: 'التربية الفنية' } }
  });
  let gradeSubject = await prisma.gradeSubject.findFirst({
    where: { gradeId: grade.id, semesterId: semester.id, subjectId: subject.id }
  });

  if (!gradeSubject) {
    console.error('GradeSubject not found!');
    process.exit(1);
  }

  await prisma.syllabusWeek.deleteMany({
    where: { gradeSubjectId: gradeSubject.id }
  });

  for (const w of ART_WEEKS) {
    await prisma.syllabusWeek.create({
      data: {
        gradeSubjectId: gradeSubject.id,
        weekNumber: w.weekNumber,
        title: w.title,
        startDateHijri: w.startDateHijri,
        endDateHijri: w.endDateHijri,
        weekType: w.isHoliday ? 'HOLIDAY' : 'LESSON',
        uploadedById: admin.id
      }
    });
  }

  console.log(`✅ Inserted ${ART_WEEKS.length} syllabus weeks with full dates & holiday tags!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
