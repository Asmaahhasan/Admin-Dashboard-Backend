import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const stages = await prisma.educationStage.findMany({
    include: {
      tracks: {
        include: {
          grades: {
            include: {
              semesters: {
                include: {
                  gradeSubjects: {
                    include: { subject: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  for (const stage of stages) {
    console.log(`📌 المرحلة: ${stage.name}`);
    for (const track of stage.tracks) {
      console.log(`  🔹 المسار: ${track.name}`);
      for (const grade of track.grades) {
        console.log(`    🟢 الصف: ${grade.name}`);
        for (const sem of grade.semesters) {
          console.log(`      📅 ${sem.name} (${sem.gradeSubjects.length} مواد):`);
          sem.gradeSubjects.forEach(gs => {
            console.log(`         • ${gs.subject.name}`);
          });
        }
      }
    }
  }
}

check().finally(() => prisma.$disconnect());
