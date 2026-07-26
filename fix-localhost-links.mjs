import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

try {
  execSync('wsl -d Ubuntu -u root pg_ctlcluster 18 main start', { stdio: 'ignore', timeout: 10000 });
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@172.')) {
    const wslIp = execSync('wsl hostname -I', { encoding: 'utf8', timeout: 3000 }).trim().split(' ')[0];
    if (wslIp) {
      process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/@\d+\.\d+\.\d+\.\d+:/, `@${wslIp}:`);
    }
  }
} catch {}

const prisma = new PrismaClient();
const targetBaseUrl = process.env.BASE_URL || 'https://api.wsyelhi.com';

async function main() {
  console.log('--------------------------------------------------');
  console.log(`Starting migration script to fix localhost links...`);
  console.log(`Target Base URL: ${targetBaseUrl}`);
  console.log('--------------------------------------------------');

  // Find all lesson activity items
  const items = await prisma.lessonActivityItem.findMany();
  console.log(`Found ${items.length} total activity items in database.`);

  let updatedCount = 0;

  for (const item of items) {
    let needsUpdate = false;
    let newUrl = item.url;
    let newFilePath = item.filePath;
    let newThumbnailUrl = item.thumbnailUrl;

    if (item.url && (item.url.startsWith('http://localhost:4001') || item.url.startsWith('http://localhost'))) {
      newUrl = item.url.replace(/^http:\/\/localhost(:\d+)?/, targetBaseUrl);
      needsUpdate = true;
    }

    if (item.filePath && (item.filePath.startsWith('http://localhost:4001') || item.filePath.startsWith('http://localhost'))) {
      newFilePath = item.filePath.replace(/^http:\/\/localhost(:\d+)?/, targetBaseUrl);
      needsUpdate = true;
    }

    if (item.thumbnailUrl && (item.thumbnailUrl.startsWith('http://localhost:4001') || item.thumbnailUrl.startsWith('http://localhost'))) {
      newThumbnailUrl = item.thumbnailUrl.replace(/^http:\/\/localhost(:\d+)?/, targetBaseUrl);
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log(`Updating Item ID: ${item.id}`);
      console.log(`  Old URL: ${item.url}`);
      console.log(`  New URL: ${newUrl}`);
      if (item.filePath) {
        console.log(`  Old FilePath: ${item.filePath}`);
        console.log(`  New FilePath: ${newFilePath}`);
      }
      if (item.thumbnailUrl) {
        console.log(`  Old Thumbnail: ${item.thumbnailUrl}`);
        console.log(`  New Thumbnail: ${newThumbnailUrl}`);
      }

      await prisma.lessonActivityItem.update({
        where: { id: item.id },
        data: {
          url: newUrl,
          filePath: newFilePath,
          thumbnailUrl: newThumbnailUrl,
        },
      });
      updatedCount++;
    }
  }

  console.log('--------------------------------------------------');
  console.log(`Migration completed successfully!`);
  console.log(`Updated ${updatedCount} items.`);
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Error during migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
