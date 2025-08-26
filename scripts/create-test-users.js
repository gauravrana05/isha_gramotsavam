require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('Creating test users...');

    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: { phone: '+919876543210' },
      update: {},
      create: {
        email: 'admin@test.com',
        phone: '+919876543210',
        firstName: 'Admin',
        lastName: 'User',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'M',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641001',
        profileComplete: true,
        role: 'admin',
        languagePreference: 'en',
      }
    });

    // Create public user
    const publicUser = await prisma.user.upsert({
      where: { phone: '+919876543211' },
      update: {},
      create: {
        email: 'user@test.com',
        phone: '+919876543211',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: new Date('1995-05-15'),
        gender: 'F',
        district: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        profileComplete: true,
        role: 'public',
        languagePreference: 'en',
      }
    });

    console.log('✅ Test users created successfully:');
    console.log('Admin User:', adminUser.email, '- Role:', adminUser.role);
    console.log('Public User:', publicUser.email, '- Role:', publicUser.role);

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();