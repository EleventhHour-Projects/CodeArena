const API_URL = 'http://localhost:3000/internal/event';
const INTERNAL_KEY = "ArthurYouAreLikeABrotherToMeSaidJohn";

async function testEndpoint() {
  console.log('--- Starting API Tests (Using Native Fetch) ---');

  const sendRequest = async (label, payload, key = INTERNAL_KEY) => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': key
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log(`${label}: STATUS ${res.status}`, data);
    } catch (err) {
      console.error(`${label}: FAILED`, err.message);
    }
  };

  // Test 1: Valid USER_RUN
  await sendRequest('Test 1 (USER_RUN)', {
    type: 'USER_RUN',
    battleId: 'battle-123',
    userId: 'user-456',
    problemId: 'prob-789'
  });

  // Test 2: Valid USER_RESULT
  await sendRequest('Test 2 (USER_RESULT)', {
    type: 'USER_RESULT',
    battleId: 'battle-123',
    userId: 'user-456',
    data: { status: 'AC' }
  });

  // Test 3: Missing Fields
  await sendRequest('Test 3 (Missing Fields)', {
    type: 'USER_RUN',
    battleId: 'battle-123'
  });

  // Test 4: Invalid Auth
  await sendRequest('Test 4 (Invalid Auth)', {
    type: 'USER_RUN',
    battleId: 'battle-123',
    userId: 'user-456'
  }, 'wrong_key');

  // Test 5: USER_TYPING
  await sendRequest('Test 5 (USER_TYPING)', {
    type: 'USER_TYPING',
    battleId: 'battle-123',
    userId: 'user-456'
  });
}

testEndpoint();
