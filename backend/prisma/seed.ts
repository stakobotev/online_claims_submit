import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Seed categories
  const categories = [
    { id: 'hospitals', name: 'Hospitals' },
    { id: 'doctors', name: 'Doctors' },
    { id: 'insurance_funds', name: 'Health Insurance Funds' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { name: cat.name },
      create: cat,
    });
  }

  // Seed default configuration
  const configEntries = [
    { key: 'min_body_length', value: process.env['MIN_BODY_LENGTH'] ?? '100' },
    { key: 'captcha_required_anonymous', value: 'true' },
    { key: 'ombudsman_email', value: process.env['OMBUDSMAN_EMAIL'] ?? '' },
  ];

  for (const entry of configEntries) {
    await prisma.configuration.upsert({
      where: { key: entry.key },
      update: { value: entry.value },
      create: entry,
    });
  }

  // Seed admin user
  const adminEmail = process.env['ADMIN_EMAIL'];
  const adminPassword = process.env['ADMIN_INITIAL_PASSWORD'];

  if (adminEmail && adminPassword) {
    const passwordHash = await argon2.hash(adminPassword, {
      type: argon2.argon2id,
      memoryCost: Number(process.env['ARGON2_MEMORY_COST'] ?? 19456),
      timeCost: Number(process.env['ARGON2_TIME_COST'] ?? 2),
      parallelism: Number(process.env['ARGON2_PARALLELISM'] ?? 1),
    });

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        name: 'Admin',
        passwordHash,
        role: 'admin',
        status: 'active',
        emailVerified: true,
      },
    });
  }

  // Seed demo data when enabled
  if (process.env['SEED_DEMO_DATA'] === 'true') {
    const demoInstitutions = [
      { categoryId: 'hospitals', name: 'City Hospital', email: 'city.hospital@example.org' },
      { categoryId: 'hospitals', name: 'Regional Medical Center', email: 'rmc@example.org' },
      { categoryId: 'hospitals', name: 'University Hospital', email: 'uni.hospital@example.org' },
      { categoryId: 'doctors', name: 'Dr. Smith Clinic', email: 'dr.smith@example.org' },
      { categoryId: 'doctors', name: 'Family Health Center', email: 'family.health@example.org' },
      { categoryId: 'doctors', name: 'Specialist Practice', email: 'specialist@example.org' },
      { categoryId: 'insurance_funds', name: 'National Health Fund', email: 'nhf@example.org' },
      { categoryId: 'insurance_funds', name: 'Regional Insurance', email: 'regional.ins@example.org' },
      { categoryId: 'insurance_funds', name: 'Public Health Insurance', email: 'phi@example.org' },
    ];

    for (const inst of demoInstitutions) {
      const existing = await prisma.institution.findFirst({
        where: { name: inst.name, categoryId: inst.categoryId },
      });
      if (!existing) {
        await prisma.institution.create({ data: inst });
      }
    }
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
