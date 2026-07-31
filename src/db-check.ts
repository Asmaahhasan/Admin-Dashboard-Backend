import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const count = await prisma.syllabusWeek.count();
  console.log('SyllabusWeek count:', count);
}

check().catch(console.error).finally(() => prisma.$disconnect());