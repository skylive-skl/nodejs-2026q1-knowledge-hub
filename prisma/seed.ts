import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const now = BigInt(Date.now());
  const salt = 10;

  // ── Users ───────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      login: 'admin',
      password: await bcrypt.hash('Admin1234', salt),
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    },
  });

  const editor = await prisma.user.upsert({
    where: { login: 'editor' },
    update: {},
    create: {
      login: 'editor',
      password: await bcrypt.hash('Editor1234', salt),
      role: 'editor',
      createdAt: now,
      updatedAt: now,
    },
  });

  // ── Categories ───────────────────────────────────────────────────────────────
  const categoryDev = await prisma.category.upsert({
    where: { name: 'Development' },
    update: {},
    create: {
      name: 'Development',
      description: 'Articles about software development',
    },
  });

  const categoryTech = await prisma.category.upsert({
    where: { name: 'Technology' },
    update: {},
    create: {
      name: 'Technology',
      description: 'Articles about technology trends',
    },
  });

  const categoryScience = await prisma.category.upsert({
    where: { name: 'Science' },
    update: {},
    create: {
      name: 'Science',
      description: 'Articles about scientific discoveries',
    },
  });

  // ── Tags ─────────────────────────────────────────────────────────────────────
  const tagNames = ['nodejs', 'typescript', 'nestjs', 'prisma', 'postgresql'];
  for (const name of tagNames) {
    await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ── Articles ──────────────────────────────────────────────────────────────────
  const article1 = await prisma.article.create({
    data: {
      title: 'Getting Started with NestJS',
      content:
        'NestJS is a progressive Node.js framework for building efficient server-side applications.',
      status: 'published',
      authorId: admin.id,
      categoryId: categoryDev.id,
      createdAt: now,
      updatedAt: now,
      tags: {
        connectOrCreate: [
          { where: { name: 'nodejs' }, create: { name: 'nodejs' } },
          { where: { name: 'nestjs' }, create: { name: 'nestjs' } },
        ],
      },
    },
  });

  const article2 = await prisma.article.create({
    data: {
      title: 'TypeScript Best Practices',
      content:
        'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.',
      status: 'published',
      authorId: editor.id,
      categoryId: categoryDev.id,
      createdAt: now,
      updatedAt: now,
      tags: {
        connectOrCreate: [
          {
            where: { name: 'typescript' },
            create: { name: 'typescript' },
          },
        ],
      },
    },
  });

  await prisma.article.create({
    data: {
      title: 'Introduction to Prisma ORM',
      content:
        'Prisma is a next-generation ORM for Node.js and TypeScript. It replaces traditional ORMs.',
      status: 'draft',
      authorId: admin.id,
      categoryId: categoryTech.id,
      createdAt: now,
      updatedAt: now,
      tags: {
        connectOrCreate: [
          { where: { name: 'prisma' }, create: { name: 'prisma' } },
          {
            where: { name: 'postgresql' },
            create: { name: 'postgresql' },
          },
        ],
      },
    },
  });

  await prisma.article.create({
    data: {
      title: 'Understanding PostgreSQL Indexes',
      content:
        'PostgreSQL provides several index types. Knowing when to use each type is essential.',
      status: 'archived',
      authorId: editor.id,
      categoryId: categoryScience.id,
      createdAt: now,
      updatedAt: now,
      tags: {
        connectOrCreate: [
          {
            where: { name: 'postgresql' },
            create: { name: 'postgresql' },
          },
        ],
      },
    },
  });

  await prisma.article.create({
    data: {
      title: 'Node.js Performance Tips',
      content:
        'Here are key tips to improve Node.js application performance in production.',
      status: 'published',
      authorId: admin.id,
      categoryId: categoryTech.id,
      createdAt: now,
      updatedAt: now,
      tags: {
        connectOrCreate: [
          { where: { name: 'nodejs' }, create: { name: 'nodejs' } },
          {
            where: { name: 'typescript' },
            create: { name: 'typescript' },
          },
        ],
      },
    },
  });

  // ── Comments ──────────────────────────────────────────────────────────────────
  await prisma.comment.createMany({
    data: [
      {
        content: 'Great article! Very helpful for getting started.',
        articleId: article1.id,
        authorId: editor.id,
        createdAt: now,
      },
      {
        content: 'Thanks for sharing this, well written!',
        articleId: article2.id,
        authorId: admin.id,
        createdAt: now,
      },
      {
        content: 'Looking forward to more content like this.',
        articleId: article1.id,
        authorId: null,
        createdAt: now,
      },
    ],
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
