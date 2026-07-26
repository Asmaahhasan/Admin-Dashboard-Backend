const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, 'node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function main() {
  const weeks = await prisma.syllabusWeek.findMany({ orderBy: { weekNumber: 'asc' } });
  console.log('Total weeks in DB:', weeks.length);
  weeks.forEach(w => {
    console.log(`Week #${w.weekNumber} [${w.id}] -> title: ${JSON.stringify(w.title)} | Hijri: ${JSON.stringify(w.startDateHijri)} | Greg: ${JSON.stringify(w.endDateHijri)}`);
  });

  const nullWeeks = weeks.filter(w => !w.startDateHijri || !w.endDateHijri);
  console.log('Null weeks count:', nullWeeks.length);
  for (const w of nullWeeks) {
    const weekOffset = (w.weekNumber - 21) * 7;
    const baseMs = new Date('2027-01-08').getTime();
    const startDate = new Date(baseMs + weekOffset * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000);
    const fd = (d) => d.getDate() + '-' + (d.getMonth() + 1) + '-' + d.getFullYear();
    const g = 'من ' + fd(startDate) + ' إلى ' + fd(endDate) + ' م';
    const h = 'من 8-9 إلى 12-9-1448 هـ';
    await prisma.syllabusWeek.update({ where: { id: w.id }, data: { startDateHijri: h, endDateHijri: g } });
    console.log(`FIXED week #${w.weekNumber}`);
  }
}

main().finally(() => prisma.$disconnect());
