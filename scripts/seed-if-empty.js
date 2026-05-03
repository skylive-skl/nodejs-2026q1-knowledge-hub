const { PrismaClient } = require('@prisma/client');
const { spawnSync } = require('node:child_process');

const prisma = new PrismaClient();

async function isDatabaseEmpty() {
  const usersCount = await prisma.user.count();
  return usersCount === 0;
}

async function run() {
  try {
    const empty = await isDatabaseEmpty();

    if (!empty) {
      console.log('Database already contains data, skipping seed');
      return;
    }

    console.log('Database is empty, running Prisma seed');

    const result = spawnSync('npx', ['prisma', 'db', 'seed'], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    });

    if (result.status !== 0) {
      process.exit(result.status || 1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error('Conditional seed failed:', error);
  process.exit(1);
});
