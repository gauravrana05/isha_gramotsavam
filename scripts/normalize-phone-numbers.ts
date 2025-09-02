/**
 * Script to normalize existing phone numbers in the database
 * Run with: npx tsx scripts/normalize-phone-numbers.ts
 */

import { PrismaClient } from '@prisma/client'
import { normalizePhoneNumber } from '../src/lib/utils/phone'

const db = new PrismaClient()

async function normalizePhoneNumbers() {
  console.log('🔄 Starting phone number normalization...')
  
  try {
    // Get all users with phone numbers
    const users = await db.user.findMany({
      where: {
        OR: [
          { phone: { not: null } },
          { whatsappNumber: { not: null } }
        ]
      },
      select: {
        id: true,
        phone: true,
        whatsappNumber: true,
        firstName: true,
        lastName: true
      }
    })

    console.log(`📱 Found ${users.length} users with phone numbers`)

    let updatedCount = 0

    for (const user of users) {
      const updates: any = {}
      let hasUpdates = false

      // Normalize main phone number
      if (user.phone) {
        const normalized = normalizePhoneNumber(user.phone)
        if (normalized && normalized !== user.phone) {
          updates.phone = normalized
          hasUpdates = true
          console.log(`📞 ${user.firstName} ${user.lastName}: ${user.phone} → ${normalized}`)
        }
      }

      // Normalize WhatsApp number
      if (user.whatsappNumber) {
        const normalized = normalizePhoneNumber(user.whatsappNumber)
        if (normalized && normalized !== user.whatsappNumber) {
          updates.whatsappNumber = normalized
          hasUpdates = true
          console.log(`💬 ${user.firstName} ${user.lastName}: ${user.whatsappNumber} → ${normalized}`)
        }
      }

      // Update if there are changes
      if (hasUpdates) {
        await db.user.update({
          where: { id: user.id },
          data: updates
        })
        updatedCount++
      }
    }

    console.log(`✅ Successfully normalized phone numbers for ${updatedCount} users`)

  } catch (error) {
    console.error('❌ Error normalizing phone numbers:', error)
  } finally {
    await db.$disconnect()
  }
}

// Run the script
normalizePhoneNumbers()
