import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const count = await p.calendarDay.count();
  console.log('📅 Total calendar days:', count);

  const holidays = await p.calendarDay.findMany({
    where: { type: 'HOLIDAY' },
    select: { date: true, dayName: true, note: true, region: true },
    orderBy: { date: 'asc' },
    take: 10,
  });
  console.log('🔴 Sample holidays:');
  holidays.forEach(h => console.log(`  ${h.date.toISOString().split('T')[0]} (${h.dayName}) [${h.region}] - ${h.note}`));

  // Check specifically the National Day week Sept 20-24, 2026
  const septWeek = await p.calendarDay.findMany({
    where: {
      date: {
        gte: new Date('2026-09-20T00:00:00.000Z'),
        lte: new Date('2026-09-24T23:59:59.000Z'),
      },
    },
  });
  console.log('\n📆 Sept 20-24 2026 calendar entries:', septWeek.length);
  septWeek.forEach(d => console.log(`  ${d.date.toISOString().split('T')[0]} (${d.dayName}) [${d.region}] ${d.type} - ${d.note}`));
}

main().catch(console.error).finally(() => p.$disconnect());
