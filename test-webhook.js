// Simple test to simulate a Stripe webhook call
// Run with: node test-webhook.js

const eventId = 'your-event-id-here'; // Replace with actual event ID
const userId = 'your-user-id-here';   // Replace with actual user ID

const testWebhook = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test-signature-bypass'
      },
      body: JSON.stringify({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {
              eventId: eventId,
              userId: userId,
              eventCode: 'TEST123'
            },
            payment_status: 'paid'
          }
        }
      })
    });

    const result = await response.json();
    console.log('Webhook test result:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
};

console.log('Testing webhook...');
console.log('Make sure to replace eventId and userId with actual values!');
testWebhook();