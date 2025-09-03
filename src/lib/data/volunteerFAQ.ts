export interface FAQItem {
  id: string;
  questionKey: string; // i18n key for question
  answerKey: string;   // i18n key for answer
  keywords: string[];  // search keywords (English base)
  context: string[];   // pages where this is relevant
  stepsKey?: string;   // i18n key for step-by-step instructions
  category: 'teams' | 'players' | 'matches' | 'fixtures' | 'media' | 'posts' | 'chat' | 'notifications' | 'general';
}

export const volunteerFAQ: FAQItem[] = [
  // TEAMS PAGE
  {
    id: 'checkin-team',
    questionKey: 'faq.teams.checkin.question',
    answerKey: 'faq.teams.checkin.answer',
    stepsKey: 'faq.teams.checkin.steps',
    keywords: ['check in', 'checkin', 'team', 'arrival', 'present'],
    context: ['teams', 'dashboard'],
    category: 'teams'
  },
  {
    id: 'search-team',
    questionKey: 'faq.teams.search.question',
    answerKey: 'faq.teams.search.answer',
    keywords: ['search', 'find', 'team', 'filter', 'sport'],
    context: ['teams'],
    category: 'teams'
  },
  {
    id: 'create-team',
    questionKey: 'faq.teams.create.question',
    answerKey: 'faq.teams.create.answer',
    stepsKey: 'faq.teams.create.steps',
    keywords: ['create', 'new', 'team', 'add', 'register'],
    context: ['teams'],
    category: 'teams'
  },

  // PLAYERS
  {
    id: 'verify-player',
    questionKey: 'faq.players.verify.question',
    answerKey: 'faq.players.verify.answer',
    stepsKey: 'faq.players.verify.steps',
    keywords: ['verify', 'player', 'documents', 'approve', 'check'],
    context: ['teams', 'players'],
    category: 'players'
  },
  {
    id: 'upload-photo',
    questionKey: 'faq.players.photo.question',
    answerKey: 'faq.players.photo.answer',
    stepsKey: 'faq.players.photo.steps',
    keywords: ['photo', 'upload', 'camera', 'picture', 'change', 'image'],
    context: ['teams', 'players'],
    category: 'players'
  },
  {
    id: 'reject-player',
    questionKey: 'faq.players.reject.question',
    answerKey: 'faq.players.reject.answer',
    keywords: ['reject', 'player', 'verification', 'deny', 'invalid'],
    context: ['teams', 'players'],
    category: 'players'
  },

  // FIXTURES
  {
    id: 'create-tournament',
    questionKey: 'faq.fixtures.create.question',
    answerKey: 'faq.fixtures.create.answer',
    stepsKey: 'faq.fixtures.create.steps',
    keywords: ['create', 'tournament', 'fixture', 'bracket', 'competition'],
    context: ['fixtures'],
    category: 'fixtures'
  },
  {
    id: 'seed-teams',
    questionKey: 'faq.fixtures.seeding.question',
    answerKey: 'faq.fixtures.seeding.answer',
    keywords: ['seed', 'ranking', 'teams', 'order', 'bracket'],
    context: ['fixtures'],
    category: 'fixtures'
  },
  {
    id: 'tournament-levels',
    questionKey: 'faq.fixtures.levels.question',
    answerKey: 'faq.fixtures.levels.answer',
    keywords: ['cluster', 'division', 'final', 'levels', 'progression'],
    context: ['fixtures'],
    category: 'fixtures'
  },

  // MATCHES
  {
    id: 'start-match',
    questionKey: 'faq.matches.start.question',
    answerKey: 'faq.matches.start.answer',
    stepsKey: 'faq.matches.start.steps',
    keywords: ['start', 'match', 'begin', 'commence'],
    context: ['matches'],
    category: 'matches'
  },
  {
    id: 'enter-score',
    questionKey: 'faq.matches.score.question',
    answerKey: 'faq.matches.score.answer',
    stepsKey: 'faq.matches.score.steps',
    keywords: ['score', 'points', 'result', 'enter', 'update'],
    context: ['matches'],
    category: 'matches'
  },
  {
    id: 'declare-winner',
    questionKey: 'faq.matches.winner.question',
    answerKey: 'faq.matches.winner.answer',
    keywords: ['winner', 'end', 'match', 'complete', 'finish'],
    context: ['matches'],
    category: 'matches'
  },

  // MEDIA
  {
    id: 'upload-media',
    questionKey: 'faq.media.upload.question',
    answerKey: 'faq.media.upload.answer',
    stepsKey: 'faq.media.upload.steps',
    keywords: ['upload', 'photo', 'video', 'media', 'camera'],
    context: ['media'],
    category: 'media'
  },
  {
    id: 'offline-upload',
    questionKey: 'faq.media.offline.question',
    answerKey: 'faq.media.offline.answer',
    keywords: ['offline', 'upload', 'sync', 'internet', 'connection'],
    context: ['media'],
    category: 'media'
  },

  // POSTS
  {
    id: 'create-post',
    questionKey: 'faq.posts.create.question',
    answerKey: 'faq.posts.create.answer',
    stepsKey: 'faq.posts.create.steps',
    keywords: ['post', 'create', 'announcement', 'message'],
    context: ['post'],
    category: 'posts'
  },
  {
    id: 'post-visibility',
    questionKey: 'faq.posts.visibility.question',
    answerKey: 'faq.posts.visibility.answer',
    keywords: ['who', 'see', 'visibility', 'private', 'public'],
    context: ['post'],
    category: 'posts'
  },

  // CHAT
  {
    id: 'send-message',
    questionKey: 'faq.chat.message.question',
    answerKey: 'faq.chat.message.answer',
    keywords: ['message', 'chat', 'send', 'communicate'],
    context: ['chat'],
    category: 'chat'
  },
  {
    id: 'urgent-issue',
    questionKey: 'faq.chat.urgent.question',
    answerKey: 'faq.chat.urgent.answer',
    keywords: ['urgent', 'emergency', 'help', 'issue', 'problem'],
    context: ['chat'],
    category: 'chat'
  },

  // NOTIFICATIONS
  {
    id: 'create-notification',
    questionKey: 'faq.notifications.create.question',
    answerKey: 'faq.notifications.create.answer',
    keywords: ['notification', 'alert', 'announce', 'notify'],
    context: ['notifications'],
    category: 'notifications'
  },

  // GENERAL
  {
    id: 'work-offline',
    questionKey: 'faq.general.offline.question',
    answerKey: 'faq.general.offline.answer',
    keywords: ['offline', 'internet', 'connection', 'sync'],
    context: ['dashboard', 'teams', 'matches'],
    category: 'general'
  },
  {
    id: 'sync-data',
    questionKey: 'faq.general.sync.question',
    answerKey: 'faq.general.sync.answer',
    keywords: ['sync', 'data', 'upload', 'connection', 'pending'],
    context: ['dashboard'],
    category: 'general'
  },
  {
    id: 'fix-mistake',
    questionKey: 'faq.general.mistake.question',
    answerKey: 'faq.general.mistake.answer',
    keywords: ['mistake', 'error', 'undo', 'fix', 'correct'],
    context: ['teams', 'matches'],
    category: 'general'
  }
];

// Helper function to get context-relevant FAQs
export const getContextualFAQs = (currentPage: string): FAQItem[] => {
  return volunteerFAQ.filter(faq => 
    faq.context.includes(currentPage) || faq.context.includes('general')
  ).sort((a, b) => {
    // Prioritize exact context matches
    const aExact = a.context.includes(currentPage) && !a.context.includes('general');
    const bExact = b.context.includes(currentPage) && !b.context.includes('general');
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return 0;
  });
};

// Helper function to search FAQs
export const searchFAQs = (query: string, currentPage?: string): FAQItem[] => {
  const searchTerms = query.toLowerCase().split(' ');
  
  return volunteerFAQ.filter(faq => {
    const keywordMatch = faq.keywords.some(keyword => 
      searchTerms.some(term => keyword.toLowerCase().includes(term))
    );
    return keywordMatch;
  }).sort((a, b) => {
    // Prioritize current page context
    if (currentPage) {
      const aContextMatch = a.context.includes(currentPage);
      const bContextMatch = b.context.includes(currentPage);
      if (aContextMatch && !bContextMatch) return -1;
      if (!aContextMatch && bContextMatch) return 1;
    }
    return 0;
  });
};
