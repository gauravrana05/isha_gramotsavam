import { readFileSync } from 'fs';
import { join } from 'path';

function analyzeSchema() {
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
  const schema = readFileSync(schemaPath, 'utf-8');
  
  console.log('🔍 Prisma Schema Analysis\n');

  // Extract models
  const modelMatches = schema.match(/model\s+(\w+)\s*{[^}]+}/g) || [];
  const models = modelMatches.map(match => {
    const nameMatch = match.match(/model\s+(\w+)/);
    return nameMatch ? nameMatch[1] : '';
  }).filter(Boolean);

  console.log('📋 MODELS FOUND:');
  models.forEach((model, i) => {
    console.log(`${i + 1}. ${model}`);
  });
  console.log(`\nTotal: ${models.length} models\n`);

  // Check for chat-related models
  console.log('💬 CHAT SYSTEM ANALYSIS:');
  const chatModels = models.filter(m => m.toLowerCase().includes('chat') || m.toLowerCase().includes('message'));
  if (chatModels.length > 0) {
    console.log('✅ Chat models found:', chatModels.join(', '));
  } else {
    console.log('❌ No chat models found - need to add ChatMessage and ChatParticipant');
  }

  // Check for key relationships
  console.log('\n🔗 KEY RELATIONSHIPS ANALYSIS:');
  
  // User relations
  const userRelations = extractRelations(schema, 'User');
  console.log('User relations:', userRelations.length > 0 ? userRelations.join(', ') : 'None found');

  // Venue relations  
  const venueRelations = extractRelations(schema, 'Venue');
  console.log('Venue relations:', venueRelations.length > 0 ? venueRelations.join(', ') : 'None found');

  // Team relations
  const teamRelations = extractRelations(schema, 'Team');
  console.log('Team relations:', teamRelations.length > 0 ? teamRelations.join(', ') : 'None found');

  // Check for missing indexes
  console.log('\n📊 INDEX ANALYSIS:');
  const indexMatches = schema.match(/@@index\([^)]+\)/g) || [];
  console.log(`Found ${indexMatches.length} indexes`);

  // Check for missing fields that chat system needs
  console.log('\n🎯 CHAT SYSTEM REQUIREMENTS:');
  const requirements = [
    { model: 'ChatMessage', exists: models.includes('ChatMessage') },
    { model: 'ChatParticipant', exists: models.includes('ChatParticipant') },
    { model: 'User', hasRelation: userRelations.some(r => r.includes('chat') || r.includes('message')) },
    { model: 'Venue', hasRelation: venueRelations.some(r => r.includes('chat') || r.includes('message')) }
  ];

  requirements.forEach(req => {
    if ('exists' in req) {
      console.log(`${req.exists ? '✅' : '❌'} ${req.model} model`);
    } else if ('hasRelation' in req) {
      console.log(`${req.hasRelation ? '✅' : '❌'} ${req.model} chat relations`);
    }
  });

  // Check for enum definitions
  console.log('\n📝 ENUM ANALYSIS:');
  const enumMatches = schema.match(/enum\s+(\w+)/g) || [];
  const enums = enumMatches.map(match => match.replace('enum ', ''));
  console.log('Enums found:', enums.length > 0 ? enums.join(', ') : 'None');

  // Summary and recommendations
  console.log('\n📋 SCHEMA GAPS & RECOMMENDATIONS:');
  
  const gaps = [];
  
  if (!models.includes('ChatMessage')) {
    gaps.push('❌ Missing ChatMessage model for venue communication');
  }
  
  if (!models.includes('ChatParticipant')) {
    gaps.push('❌ Missing ChatParticipant model for chat user tracking');
  }

  if (!userRelations.some(r => r.includes('SentMessages'))) {
    gaps.push('❌ User model missing chat message relations');
  }

  if (!venueRelations.some(r => r.includes('chatMessages'))) {
    gaps.push('❌ Venue model missing chat message relations');
  }

  if (gaps.length === 0) {
    console.log('✅ Schema appears complete for chat system');
  } else {
    gaps.forEach(gap => console.log(gap));
  }

  console.log('\n🎯 NEXT STEPS:');
  if (gaps.length > 0) {
    console.log('1. Add missing chat models to schema.prisma');
    console.log('2. Add chat relations to User and Venue models');
    console.log('3. Run prisma db push to update database');
    console.log('4. Update seed data if needed');
  } else {
    console.log('1. Schema is ready for chat system');
    console.log('2. Run seed script to populate data');
    console.log('3. Test chat functionality');
  }
}

function extractRelations(schema: string, modelName: string): string[] {
  const modelMatch = schema.match(new RegExp(`model\\s+${modelName}\\s*{([^}]+)}`, 's'));
  if (!modelMatch) return [];
  
  const modelContent = modelMatch[1];
  const relationMatches = modelContent.match(/(\w+)\s+\w+(\[\])?\s+@relation/g) || [];
  
  return relationMatches.map(match => {
    const fieldMatch = match.match(/(\w+)\s+/);
    return fieldMatch ? fieldMatch[1] : '';
  }).filter(Boolean);
}

analyzeSchema();
