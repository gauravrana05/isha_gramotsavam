// Test component to verify chatbot functionality
// Add this to any volunteer page to test

import VolunteerHelpBot from '@/components/volunteer/VolunteerHelpBot';

export default function TestChatbot() {
  return (
    <div className="p-4">
      <h1>Chatbot Test Page</h1>
      <p>The help button should appear in the bottom right corner.</p>
      
      {/* Test different page contexts */}
      <div className="space-y-4 mt-8">
        <div className="p-4 bg-blue-50 rounded">
          <h2>Teams Page Context</h2>
          <p>When on /teams page, should show team-related questions first</p>
        </div>
        
        <div className="p-4 bg-green-50 rounded">
          <h2>Matches Page Context</h2>
          <p>When on /matches page, should show match-related questions first</p>
        </div>
        
        <div className="p-4 bg-yellow-50 rounded">
          <h2>Search Test</h2>
          <p>Try searching for: "check in", "verify", "upload", "score"</p>
        </div>
      </div>
      
      <VolunteerHelpBot />
    </div>
  );
}
