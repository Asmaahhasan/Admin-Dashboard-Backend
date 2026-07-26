import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

async function main() {
  const wslIp = execSync('wsl hostname -I', { encoding: 'utf8' }).trim().split(' ')[0];
  console.log('--- TEST 1: Dynamic WSL IP (', wslIp, ') ---');
  const p1 = new PrismaClient({ datasources: { db: { url: `postgresql://postgres:postgres@${wslIp}:5432/madrasati?schema=public` } } });
  try {
    const c1 = await p1.user.count();
    console.log('RESULT: ✅ SUCCESS with WSL IP! User count =', c1);
  } catch (e) {
    console.log('RESULT: ❌ FAILED with WSL IP:', e.message.split('\n')[0]);
  } finally {
    await p1.$disconnect();
  }

  console.log('\n--- TEST 2: 127.0.0.1 ---');
  const p2 = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:postgres@127.0.0.1:5432/madrasati?schema=public' } } });
  try {
    const c2 = await p2.user.count();
    console.log('RESULT: ✅ SUCCESS with 127.0.0.1! User count =', c2);
  } catch (e) {
    console.log('RESULT: ❌ FAILED with 127.0.0.1:', e.message.split('\n')[0]);
  } finally {
    await p2.$disconnect();
  }
}

main();
