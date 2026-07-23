// verify.mjs
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
  console.log('\n== ' + g.name + ' ==');
  for (const sem of g.semesters) {
    const names = sem.gradeSubjects.map(gs => gs.subject.name);
    console.log('  ' + sem.name + ' (' + names.length + ' مادة): ' + (names.join(' | ') || '(لا مواد)'));
  }
}
await prisma.$disconnect();
