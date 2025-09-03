import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting simplified seed...')

  // 5. Seed Sample Users
  console.log('👥 Seeding sample users...')
  const sampleUsers = [
    {
      id: "550e8400-e29b-41d4-a716-446655440102",
      firstName: "Team",
      lastName: "Captain",
      fullName: "Team Captain",
      email: "captain@example.com",
      phone: "+919876543211",
      role: "public"
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440103",
      firstName: "Technical",
      lastName: "Volunteer",
      fullName: "Technical Volunteer",
      email: "tech@isha.foundation",
      phone: "+919876543212",
      role: "technical_volunteer"
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440101',
      firstName: 'Admin',
      lastName: 'User',
      fullName: 'Admin User',
      email: 'admin@isha.foundation',
      phone: '+919876543210',
      role: 'admin'
    }
  ]

  for (const user of sampleUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user
    })
    console.log(`✅ User: ${user.fullName} (${user.role})`)
  }

  console.log('🎉 Simplified seed completed successfully!')
  console.log('📝 Note: Complex mappings skipped - can be added via admin interface')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
