// prisma/seed.mjs - Database seeding script
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Hash the password
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Create or update admin user
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created/updated:', admin.username);

  // Seed sample applications
  const applications = [
    {
      recordNumber: '190608',
      appType: 'NEW',
      membership: 'HOUSEHOLD',
      area: 'Area 2-Nasipit',
      district: 'Dist 7 - NASIPIT',
      barangay: 'KINABJANGAN',
      firstName: 'JHONELLE',
      middleName: 'AYENSA',
      lastName: 'ALMEROL',
      suffixName: '',
      birthdate: '10/20/1988',
      noMiddleName: false,
      gender: 'MALE',
      civilStatus: 'married',
      spouseFirst: 'Maria',
      spouseMiddle: 'Santos',
      spouseLast: 'Almerol',
      spouseSuffix: '',
      spouseBirthdate: '01/01/1990',
      residenceAddress: 'D-1, BRGY. KINABJANGAN, NASIPIT, AGUSAN DEL NORTE',
      cellphone: '09976059397',
      landline: '',
      email: 'jhonelle.almerol@example.com',
      privacyConsent: true,
      privacyNewsletter: true,
      privacyEmail: false,
      privacySms: true,
      privacyPhone: false,
      privacySocial: false,
      cosignatory: '',
      witness: '',
      status: 'SIGNED_UP',
      orNumber: '896052',
      dateIssued: '11/18/2021',
      notes: '',
    },
    {
      recordNumber: '190609',
      appType: 'CHANGE',
      membership: 'HOUSEHOLD',
      area: 'Area 2-Nasipit',
      district: 'Dist 7 - NASIPIT',
      barangay: 'TALISAY',
      firstName: 'CARLOS',
      middleName: 'REYES',
      lastName: 'MAGNO',
      suffixName: 'JR.',
      birthdate: '05/15/1985',
      noMiddleName: false,
      gender: 'MALE',
      civilStatus: 'married',
      spouseFirst: 'Ana',
      spouseMiddle: 'Lopez',
      spouseLast: 'Magno',
      spouseSuffix: '',
      spouseBirthdate: '08/22/1987',
      residenceAddress: 'Purok 3, Brgy. Talisay, Nasipit, Agusan del Norte',
      cellphone: '09171234567',
      landline: '(085) 234-5678',
      email: 'carlos.magno@example.com',
      privacyConsent: true,
      privacyNewsletter: false,
      privacyEmail: true,
      privacySms: false,
      privacyPhone: true,
      privacySocial: false,
      cosignatory: 'Juan Dela Cruz',
      witness: 'Pedro Reyes',
      status: 'PENDING',
      orNumber: '896053',
      dateIssued: '02/01/2025',
      notes: 'Change of address.',
    },
    {
      recordNumber: '190610',
      appType: 'NEW',
      membership: 'CORPORATE',
      area: 'Area 1-Butuan',
      district: 'Dist 1 - BUTUAN',
      barangay: 'VILLANUEVA',
      firstName: 'MARIA',
      middleName: '',
      lastName: 'SANTOS',
      suffixName: '',
      birthdate: '12/03/1992',
      noMiddleName: true,
      gender: 'FEMALE',
      civilStatus: 'single',
      spouseFirst: '',
      spouseMiddle: '',
      spouseLast: '',
      spouseSuffix: '',
      spouseBirthdate: '01/01/1900',
      residenceAddress: 'Blk 5, Villanueva Subd., Butuan City',
      cellphone: '09987654321',
      landline: '',
      email: 'maria.santos@example.com',
      privacyConsent: false,
      privacyNewsletter: false,
      privacyEmail: false,
      privacySms: false,
      privacyPhone: false,
      privacySocial: false,
      cosignatory: '',
      witness: '',
      status: 'APPROVED',
      orNumber: '896054',
      dateIssued: '01/15/2025',
      notes: 'Corporate account for business.',
    },
  ];

  for (const app of applications) {
    await prisma.application.upsert({
      where: { recordNumber: app.recordNumber },
      update: {},
      create: app,
    });
  }

  console.log(`✅ ${applications.length} sample applications created/updated`);

  // Seed location data
  const area1 = await prisma.area.upsert({
    where: { name: 'Area 1-Butuan' },
    update: {},
    create: { name: 'Area 1-Butuan', code: 'AREA1' },
  });

  const area2 = await prisma.area.upsert({
    where: { name: 'Area 2-Nasipit' },
    update: {},
    create: { name: 'Area 2-Nasipit', code: 'AREA2' },
  });

  const district1 = await prisma.district.upsert({
    where: {
      name_areaId: {
        name: 'Dist 1 - BUTUAN',
        areaId: area1.id,
      },
    },
    update: {},
    create: {
      name: 'Dist 1 - BUTUAN',
      code: 'D1',
      areaId: area1.id,
    },
  });

  const district7 = await prisma.district.upsert({
    where: {
      name_areaId: {
        name: 'Dist 7 - NASIPIT',
        areaId: area2.id,
      },
    },
    update: {},
    create: {
      name: 'Dist 7 - NASIPIT',
      code: 'D7',
      areaId: area2.id,
    },
  });

  const barangays = [
    { name: 'VILLANUEVA', districtId: district1.id },
    { name: 'KINABJANGAN', districtId: district7.id },
    { name: 'TALISAY', districtId: district7.id },
  ];

  for (const brgy of barangays) {
    await prisma.barangay.upsert({
      where: {
        name_districtId: {
          name: brgy.name,
          districtId: brgy.districtId,
        },
      },
      update: {},
      create: brgy,
    });
  }

  console.log('✅ Location data seeded (2 areas, 2 districts, 3 barangays)');
  console.log('');
  console.log('📝 Login credentials:');
  console.log('   URL: http://localhost:3000/admin-login');
  console.log('   Username: admin');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
