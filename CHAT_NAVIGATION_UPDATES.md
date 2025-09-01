# Chat System Navigation Updates

## Navigation Links to Add

### Volunteer Navigation
Add to volunteer venue layout navigation:
```tsx
{
  name: 'Chat',
  href: `/volunteer/venues/${venueId}/chat`,
  icon: MessageSquare,
  description: 'Send messages to players'
}
```

### Player Navigation  
Add to player dashboard navigation:
```tsx
{
  name: 'Messages',
  href: '/player/messages',
  icon: MessageSquare,
  description: 'View venue messages'
}
```

### Admin Navigation
Add to admin dashboard navigation:
```tsx
{
  name: 'Communication',
  href: '/admin/chat',
  icon: MessageSquare,
  description: 'Monitor venue communications'
}
```

## Database Schema Updates Needed

Add to schema.prisma:
```prisma
model ChatMessage {
  id        String   @id @default(cuid())
  content   String
  venueId   String
  senderId  String
  senderRole String
  targetType String
  targetId  String?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  venue     Venue    @relation(fields: [venueId], references: [id])
  sender    User     @relation("SentMessages", fields: [senderId], references: [id])

  @@map("chat_messages")
}

model ChatParticipant {
  id       String @id @default(cuid())
  venueId  String
  userId   String
  role     String
  isActive Boolean @default(true)
  lastSeen DateTime @default(now())

  venue    Venue  @relation(fields: [venueId], references: [id])
  user     User   @relation("ChatParticipant", fields: [userId], references: [id])

  @@unique([venueId, userId])
  @@map("chat_participants")
}
```

## Features Implemented

### ✅ Volunteer Interface
- Send messages to all participants
- Filter by captains only
- Filter by players only  
- Send individual messages
- Real-time message history
- Auto-refresh every 10 seconds

### ✅ Player Interface
- View messages targeted to them
- Color-coded message types
- Auto-refresh every 15 seconds
- Mark messages as read
- Venue selection for multiple venues

### ✅ Admin Interface
- Monitor all venue communications
- Send messages as admin
- View communication statistics
- Message history and analytics
- Real-time monitoring dashboard

## Usage Flow

1. **Volunteers** go to `/volunteer/venues/[venueId]/chat`
2. **Players** go to `/player/messages` and select venue
3. **Admins** go to `/admin/chat` for monitoring
4. Messages are venue-specific and role-filtered
5. Real-time updates keep everyone synchronized

## Next Steps

1. Add navigation links to respective layouts
2. Run database migration for chat tables
3. Test end-to-end messaging flow
4. Add push notifications (optional)
5. Add message search/filtering (optional)
