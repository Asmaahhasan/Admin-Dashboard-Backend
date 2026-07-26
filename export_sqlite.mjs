import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';

const db = new DatabaseSync('./prisma/dev.db');

// Get all table names
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name").all();
console.log('Tables found:', tables.map(t => t.name).join(', '));

// Count rows in each table
for (const t of tables) {
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get();
  console.log(`  ${t.name}: ${row.cnt} rows`);
}

// Export key tables
const exportData = {};
const keyTables = [
  'education_stages', 'tracks', 'grades', 'semesters', 'subjects',
  'grade_subjects', 'syllabus_weeks', 'lesson_activities', 'lesson_activity_items',
  'users', 'admins'
];

for (const tname of keyTables) {
  try {
    const rows = db.prepare(`SELECT * FROM "${tname}"`).all();
    exportData[tname] = rows;
    console.log(`Exported ${tname}: ${rows.length} rows`);
  } catch(e) {
    console.log(`SKIP ${tname}: ${e.message}`);
  }
}

db.close();

writeFileSync('./sqlite_export.json', JSON.stringify(exportData, null, 2));
console.log('\nExported to sqlite_export.json');
