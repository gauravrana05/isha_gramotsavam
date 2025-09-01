// Simple load testing script
const https = require('https');

const BASE_URL = 'https://your-app.vercel.app'; // Replace with actual URL
const CONCURRENT_USERS = 50;
const TEST_DURATION = 60000; // 1 minute

const endpoints = [
  '/',
  '/en/public/sports',
  '/api/trpc/public.sports.getAll',
  '/en/profile/complete',
];

function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    https.get(`${BASE_URL}${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          endpoint,
          status: res.statusCode,
          responseTime,
          success: res.statusCode < 400
        });
      });
    }).on('error', (err) => {
      reject({ endpoint, error: err.message });
    });
  });
}

async function runLoadTest() {
  console.log(`🚀 Starting load test: ${CONCURRENT_USERS} users for ${TEST_DURATION/1000}s`);
  
  const results = [];
  const startTime = Date.now();
  
  while (Date.now() - startTime < TEST_DURATION) {
    const promises = [];
    
    for (let i = 0; i < CONCURRENT_USERS; i++) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      promises.push(makeRequest(endpoint));
    }
    
    try {
      const batchResults = await Promise.allSettled(promises);
      results.push(...batchResults.map(r => r.value || r.reason));
      
      // Wait 1 second between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Batch error:', error);
    }
  }
  
  // Analyze results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const avgResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
  
  console.log('\n📊 Load Test Results:');
  console.log(`Total Requests: ${results.length}`);
  console.log(`Successful: ${successful.length} (${(successful.length/results.length*100).toFixed(1)}%)`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`Max Response Time: ${Math.max(...successful.map(r => r.responseTime))}ms`);
  
  if (avgResponseTime < 2000 && successful.length/results.length > 0.95) {
    console.log('✅ Load test PASSED');
  } else {
    console.log('❌ Load test FAILED - Performance issues detected');
  }
}

// Run if called directly
if (require.main === module) {
  runLoadTest().catch(console.error);
}

module.exports = { runLoadTest };
