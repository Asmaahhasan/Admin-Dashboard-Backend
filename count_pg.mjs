import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('educationStages:', await prisma.educationStage.count());
  console.log('grades:', await prisma.grade.count());
  console.log('subjects:', await prisma.subject.count());
  console.log('syllabusWeeks:', await prisma.syllabusWeek.count());
  console.log('lessonActivities:', await prisma.lessonActivity.count());
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());