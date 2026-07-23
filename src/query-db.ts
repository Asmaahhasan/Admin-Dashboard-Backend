import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const stages = await prisma.educationStage.findMany({
    include: {
      tracks: {
        include: {
          grades: true
        }
      }
    }
  });
  console.log(JSON.stringify(stages, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
