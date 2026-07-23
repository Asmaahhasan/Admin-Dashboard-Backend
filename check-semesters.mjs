// check-semesters.mjs
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const grades = await prisma.grade.findMany({
  where: { name: { in: ['الصف الأول الابتدائي', 'الصف السادس الابتدائي'] }},
  include: {
    semesters: {
      orderBy: { order: 'asc' },
      include: { gradeSubjects: { include: { subject: true }}}
    }
  }
});

for (const g of grades) {
  console.log('\n=== ' + g.name + ' (id: ' + g.id + ') ===');
  for (const sem of g.semesters) {
    const names = sem.gradeSubjects.map(gs => gs.subject.name);
    console.log('  [order=' + sem.order + '] ' + sem.name + ' (id: ' + sem.id + ') => ' + names.length + ' مادة');
    if (names.length > 0) console.log('    ' + names.join(' | '));
  }
}
await prisma.$disconnect();
