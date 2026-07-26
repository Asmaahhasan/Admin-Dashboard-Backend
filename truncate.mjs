import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up existing database records to allow schema migration...');
  await prisma.syllabusWeek.deleteMany();
  console.log('SyllabusWeek table cleared!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
