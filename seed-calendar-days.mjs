import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Saudi Academic Calendar Days 2025-2026...');

  const daysToSeed = [
    // ===================== GENERAL (عام) - لجميع مناطق المملكة =====================

    // اليوم الوطني 2025 - 23 سبتمبر
    { date: new Date('2025-09-23T00:00:00.000Z'), dayName: 'الثلاثاء', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة اليوم الوطني السعودي' },

    // إجازة عيد الفطر 2026 (تقريباً مارس)
    { date: new Date('2026-03-28T00:00:00.000Z'), dayName: 'السبت', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة عيد الفطر المبارك' },
    { date: new Date('2026-03-29T00:00:00.000Z'), dayName: 'الأحد', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة عيد الفطر المبارك' },
    { date: new Date('2026-03-30T00:00:00.000Z'), dayName: 'الاثنين', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة عيد الفطر المبارك' },
    { date: new Date('2026-03-31T00:00:00.000Z'), dayName: 'الثلاثاء', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة عيد الفطر المبارك' },
    { date: new Date('2026-04-01T00:00:00.000Z'), dayName: 'الأربعاء', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة عيد الفطر المبارك' },

    // إجازة عيد الأضحى 2026 (تقريباً يونيو)
    { date: new Date('2026-06-05T00:00:00.000Z'), dayName: 'الجمعة', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة عيد الأضحى المبارك' },
    { date: new Date('2026-06-06T00:00:00.000Z'), dayName: 'السبت', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة عيد الأضحى المبارك' },
    { date: new Date('2026-06-07T00:00:00.000Z'), dayName: 'الأحد', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة عيد الأضحى المبارك' },
    { date: new Date('2026-06-08T00:00:00.000Z'), dayName: 'الاثنين', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة عيد الأضحى المبارك' },
    { date: new Date('2026-06-09T00:00:00.000Z'), dayName: 'الثلاثاء', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة عيد الأضحى المبارك' },

    // اليوم الوطني 2026 - 23 سبتمبر
    { date: new Date('2026-09-23T00:00:00.000Z'), dayName: 'الأربعاء', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة اليوم الوطني السعودي' },

    // اختبارات منتصف الفصل الأول
    { date: new Date('2025-11-09T00:00:00.000Z'), dayName: 'الأحد', type: 'EXAM', region: 'GENERAL', note: 'بداية اختبارات منتصف الفصل الأول' },
    { date: new Date('2025-11-10T00:00:00.000Z'), dayName: 'الاثنين', type: 'EXAM', region: 'GENERAL', note: 'اختبارات منتصف الفصل الأول' },
    { date: new Date('2025-11-11T00:00:00.000Z'), dayName: 'الثلاثاء', type: 'EXAM', region: 'GENERAL', note: 'اختبارات منتصف الفصل الأول' },
    { date: new Date('2025-11-12T00:00:00.000Z'), dayName: 'الأربعاء', type: 'EXAM', region: 'GENERAL', note: 'اختبارات منتصف الفصل الأول' },
    { date: new Date('2025-11-13T00:00:00.000Z'), dayName: 'الخميس', type: 'EXAM', region: 'GENERAL', note: 'اختبارات منتصف الفصل الأول' },

    // إجازة منتصف الفصل الأول
    { date: new Date('2025-11-16T00:00:00.000Z'), dayName: 'الأحد', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة منتصف الفصل الأول' },
    { date: new Date('2025-11-17T00:00:00.000Z'), dayName: 'الاثنين', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة منتصف الفصل الأول' },
    { date: new Date('2025-11-18T00:00:00.000Z'), dayName: 'الثلاثاء', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة منتصف الفصل الأول' },
    { date: new Date('2025-11-19T00:00:00.000Z'), dayName: 'الأربعاء', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة منتصف الفصل الأول' },
    { date: new Date('2025-11-20T00:00:00.000Z'), dayName: 'الخميس', type: 'HOLIDAY', region: 'GENERAL', note: 'إجازة منتصف الفصل الأول' },

    // ===================== MAKKAH (مكة المكرمة) - إضافية لتقويم مكة =====================

    // موسم الحج - إجازة إضافية لمكة
    { date: new Date('2026-06-01T00:00:00.000Z'), dayName: 'الاثنين', type: 'HOLIDAY', region: 'MAKKAH', note: 'إجازة موسم الحج (مكة المكرمة)' },
    { date: new Date('2026-06-02T00:00:00.000Z'), dayName: 'الثلاثاء', type: 'HOLIDAY', region: 'MAKKAH', note: 'إجازة موسم الحج (مكة المكرمة)' },
    { date: new Date('2026-06-03T00:00:00.000Z'), dayName: 'الأربعاء', type: 'HOLIDAY', region: 'MAKKAH', note: 'يوم عرفة (إجازة مكة المكرمة)' },
    { date: new Date('2026-06-04T00:00:00.000Z'), dayName: 'الخميس', type: 'HOLIDAY', region: 'MAKKAH', note: 'أول أيام عيد الأضحى (مكة المكرمة)' },
    { date: new Date('2025-10-15T00:00:00.000Z'), dayName: 'الأربعاء', type: 'HOLIDAY', region: 'MAKKAH', note: 'إجازة محلية - مكة المكرمة' },

    // ===================== JEDDAH (جدة) =====================

    // إجازة محلية جدة (موسم الأمطار أو مناسبة محلية)
    { date: new Date('2026-01-11T00:00:00.000Z'), dayName: 'الأحد', type: 'HOLIDAY', region: 'JEDDAH', note: 'إجازة طارئة - أمطار غزيرة (جدة)' },
    { date: new Date('2025-10-20T00:00:00.000Z'), dayName: 'الاثنين', type: 'HOLIDAY', region: 'JEDDAH', note: 'إجازة محلية - محافظة جدة' },
    { date: new Date('2026-02-05T00:00:00.000Z'), dayName: 'الخميس', type: 'HOLIDAY', region: 'JEDDAH', note: 'إجازة محلية - محافظة جدة' },

    // ===================== TAIF (الطائف) =====================

    // إجازة موسم ورد الطائف وإجازات محلية
    { date: new Date('2026-04-10T00:00:00.000Z'), dayName: 'الجمعة', type: 'HOLIDAY', region: 'TAIF', note: 'إجازة موسم ورد الطائف' },
    { date: new Date('2025-10-08T00:00:00.000Z'), dayName: 'الأربعاء', type: 'HOLIDAY', region: 'TAIF', note: 'إجازة محلية - محافظة الطائف' },
    { date: new Date('2026-03-15T00:00:00.000Z'), dayName: 'الأحد', type: 'HOLIDAY', region: 'TAIF', note: 'إجازة محلية - محافظة الطائف' },
  ];

  let count = 0;
  for (const day of daysToSeed) {
    await prisma.calendarDay.upsert({
      where: {
        date_region: {
          date: day.date,
          region: day.region,
        }
      },
      update: day,
      create: day,
    });
    count++;
  }

  console.log(`✅ Academic Calendar seeded: ${count} days for GENERAL, MAKKAH, JEDDAH, TAIF!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
