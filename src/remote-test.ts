import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:madrasati@76.13.51.15:5432/madrasati?schema=public',
    },
  },
});

async function main() {
  console.log('Connecting to PostgreSQL database at 76.13.51.15:5432...');
  await prisma.$connect();
  console.log('✅ CONNECTED SUCCESSFULLY!');

  const count = await prisma.syllabusWeek.count();
  console.log('Total SyllabusWeek count in 76.13.51.15 DB:', count);

  const weeks = await prisma.syllabusWeek.findMany({
    take: 30,
    include: {
      gradeSubject: {
        include: {
          subject: true,
          grade: true,
          semester: true,
        },
      },
    },
  });

  console.log('Fetched weeks count:', weeks.length);
  weeks.forEach((w, i) => {
    console.log(`[${i + 1}] ID: ${w.id} | Week #: ${w.weekNumber} | Title: ${w.title} | Region: ${w.region} | Subject: ${w.gradeSubject?.subject?.name} | gradeSubjectId: ${w.gradeSubjectId}`);
  });
}

main()
  .catch(e => console.error('Error:', e))
  .finally(() => prisma.$disconnect());
