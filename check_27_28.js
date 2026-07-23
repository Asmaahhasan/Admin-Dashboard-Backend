const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const weeks = await prisma.syllabusWeek.findMany({
    where: {
      id: { in: ['f3c9c14b-2da5-4b13-a4a8-7891279b44d7', '88a62e17-4c77-455e-9cd8-1e6b5af8ad43'] }
    }
  });

  console.log('--- WEEKS 27 & 28 IN DB ---');
  weeks.forEach(w => {
    console.log(`ID: ${w.id} | Week #${w.weekNumber} | title: "${w.title}" | startDateHijri: ${JSON.stringify(w.startDateHijri)} | endDateHijri: ${JSON.stringify(w.endDateHijri)}`);
  });
}

main().finally(() => prisma.$disconnect());
