const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔄 Testing login with real credentials...');
    
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'teacher@test.com',
      password: 'teacher123'
    });
    
    console.log('✅ Login successful!');
    console.log('User:', response.data.data.user);
    console.log('Token (first 20 chars):', response.data.data.token.substring(0, 20) + '...');
    console.log('\n📋 Copy this token to use in your browser:');
    console.log(response.data.data.token);
    
    // Test getting events with the token
    console.log('\n🔄 Testing events API with token...');
    const eventsResponse = await axios.get('http://localhost:5001/api/events/my/events?type=organized', {
      headers: {
        'Authorization': `Bearer ${response.data.data.token}`
      }
    });
    
    console.log('✅ Events fetched successfully!');
    console.log('Number of events:', eventsResponse.data.data?.length || 0);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testLogin();