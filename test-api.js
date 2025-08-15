// Test script to check API connectivity and functionality
const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://doctor-connect-25.netlify.app/.netlify/functions/api'
    : 'http://localhost:3000/api';

async function testAPI() {
    console.log('🧪 Testing Doctor Connect API...');
    console.log('API Base URL:', API_BASE_URL);
    
    try {
        // Test health endpoint
        console.log('\n1. Testing health endpoint...');
        const healthResponse = await fetch(`${API_BASE_URL}/health`);
        console.log('Health status:', healthResponse.status);
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('Health data:', healthData);
        }
        
        // Test hospitals endpoint (public)
        console.log('\n2. Testing hospitals endpoint...');
        const hospitalsResponse = await fetch(`${API_BASE_URL}/hospitals?limit=5`);
        console.log('Hospitals status:', hospitalsResponse.status);
        if (hospitalsResponse.ok) {
            const hospitalsData = await hospitalsResponse.json();
            console.log('Hospitals count:', hospitalsData.hospitals?.length || 0);
        }
        
        // Test authentication endpoints
        console.log('\n3. Testing authentication endpoints...');
        
        // Test login with invalid credentials
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'wrongpassword'
            })
        });
        console.log('Login status:', loginResponse.status);
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('Login response:', loginData);
        } else {
            const errorData = await loginResponse.json();
            console.log('Login error:', errorData);
        }
        
        console.log('\n✅ API test completed!');
        
    } catch (error) {
        console.error('❌ API test failed:', error);
    }
}

// Run the test
testAPI();
