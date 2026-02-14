// app.js - Express.js Facebook Bot
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();

// ============================================
// CONFIGURATION
// ============================================
const PAGE_ACCESS_TOKEN = 'EAAasEsQYWhMBQsV3KUGYf4SKZBtIYwTApQqW3hf79gAsVZBrAMV3TWjxmZAr6JcSFagF1MdTfsNdHk4ZBUayBLuhP2GDSbdvtPzRM3n8Y9zakwQZCiObZB77cnRdkDwyUBWtedPZBP06DRcCZBxvQyhkRG4ejdFqTiD0usOzeGU17zTbUwItoSq5NYxRHsunvXjpnPN5LQZDZD';
const VERIFY_TOKEN = 'mytoken'; // Change this!
const APP_SECRET = 'mysecret'; // Optional but recommended
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Verify webhook signature
function verifySignature(req) {
  if (!APP_SECRET) return true;
  
  const signature = req.headers['x-hub-signature'];
  if (!signature) return false;
  
  const hmac = crypto.createHmac('sha1', APP_SECRET);
  const digest = 'sha1=' + hmac.update(JSON.stringify(req.body)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Send message to Facebook
async function sendMessage(senderId, messageText) {
  try {
    const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
    
    const response = await axios.post(url, {
      recipient: { id: senderId },
      message: { text: messageText },
      messaging_type: 'RESPONSE'
    });
    
    console.log('Message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
    throw error;
  }
}

// Send typing indicator
async function sendTypingIndicator(senderId) {
  try {
    const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
    
    await axios.post(url, {
      recipient: { id: senderId },
      sender_action: 'typing_on'
    });
  } catch (error) {
    console.error('Error sending typing indicator:', error.message);
  }
}

// Mark message as seen
async function markAsSeen(senderId) {
  try {
    const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
    
    await axios.post(url, {
      recipient: { id: senderId },
      sender_action: 'mark_seen'
    });
  } catch (error) {
    console.error('Error marking as seen:', error.message);
  }
}

// ============================================
// MESSAGE HANDLERS
// ============================================

// Handle incoming messages
async function handleMessage(senderId, message) {
  console.log('Handling message from:', senderId, 'Message:', message);
  
  // Mark as seen
  await markAsSeen(senderId);
  
  // Send typing indicator
  await sendTypingIndicator(senderId);
  
  let response;
  
  if (message.text) {
    const text = message.text.toLowerCase().trim();
    
    // Command handling
    if (text === '/help' || text === 'help') {
      response = `
🤖 **Bot Commands**
━━━━━━━━━━━━━━━━━━━
• /help - Show this menu
• /about - About this bot
• /contact - Contact info
• /time - Current time
• /echo [text] - Echo your text
• /menu - Show interactive menu
━━━━━━━━━━━━━━━━━━━
Type any command to get started!`;
    }
    else if (text === '/about') {
      response = '🤖 This is an Express.js Facebook bot running on Vercel!\nCreated with Node.js and Express.';
    }
    else if (text === '/contact') {
      response = '📧 Email: bot@example.com\n📞 Phone: +1-234-567-8900\n🌐 Website: https://example.com';
    }
    else if (text === '/time') {
      const now = new Date();
      response = `🕐 Current time: ${now.toLocaleString()}`;
    }
    else if (text.startsWith('/echo ')) {
      const echoText = text.substring(6);
      response = `🔊 Echo: ${echoText}`;
    }
    else if (text === '/menu') {
      response = '📋 Main Menu:\n1. Products\n2. Services\n3. Support\n\nReply with the number or name!';
    }
    else if (text === 'hi' || text === 'hello') {
      response = '👋 Hello! Welcome to our bot. Type /help to see available commands.';
    }
    else if (text === '1' || text.includes('product')) {
      response = '🛍️ Our Products:\n• Product A - $10\n• Product B - $20\n• Product C - $30\n\nVisit our website to order!';
    }
    else if (text === '2' || text.includes('service')) {
      response = '🔧 Our Services:\n• Consulting\n• Support\n• Training\n\nContact us for pricing!';
    }
    else if (text === '3' || text.includes('support')) {
      response = '🎧 Support:\n• Email: support@example.com\n• Phone: 1-800-123-4567\n• Live chat on website';
    }
    else {
      response = `You said: "${message.text}"\nType /help for available commands.`;
    }
  } else if (message.attachments) {
    const attachmentType = message.attachments[0].type;
    response = `📎 Received a ${attachmentType} attachment. Our team will review it.`;
  } else {
    response = 'Thanks for your message! Type /help for commands.';
  }
  
  // Small delay to simulate typing
  setTimeout(async () => {
    await sendMessage(senderId, response);
  }, 1000);
}

// Handle postbacks (button clicks)
async function handlePostback(senderId, postback) {
  console.log('Handling postback from:', senderId, 'Payload:', postback.payload);
  
  let response;
  
  switch (postback.payload) {
    case 'GET_STARTED':
      response = 'Welcome! Thanks for getting started. Type /help to see what I can do.';
      break;
    case 'MAIN_MENU':
      response = '📋 Main Menu:\n/help - Commands\n/about - About us\n/contact - Contact info';
      break;
    default:
      response = `You clicked: ${postback.payload}`;
  }
  
  await sendMessage(senderId, response);
}

// ============================================
// ROUTES
// ============================================

// Home route
app.get('/', (req, res) => {
  res.json({
    name: 'Facebook Bot API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      webhook: 'GET /webhook - Webhook verification',
      webhook_post: 'POST /webhook - Receive messages',
      health: 'GET /health - Health check'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Webhook verification (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('Webhook verification - Mode:', mode, 'Token:', token);

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed');
    res.status(403).send('Verification failed');
  }
});

// Webhook for receiving messages (POST)
app.post('/webhook', async (req, res) => {
  try {
    // Verify signature (optional but recommended)
    if (APP_SECRET && !verifySignature(req)) {
      console.error('❌ Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const body = req.body;
    console.log('Received webhook:', JSON.stringify(body, null, 2));

    if (body.object === 'page') {
      // Process each entry
      for (const entry of body.entry) {
        // Process each messaging event
        for (const event of entry.messaging) {
          const senderId = event.sender.id;
          
          // Handle messages
          if (event.message) {
            await handleMessage(senderId, event.message);
          }
          
          // Handle postbacks
          if (event.postback) {
            await handlePostback(senderId, event.postback);
          }
          
          // Handle message deliveries
          if (event.delivery) {
            console.log('Message delivered to:', senderId);
          }
          
          // Handle message reads
          if (event.read) {
            console.log('Message read by:', senderId);
          }
        }
      }

      res.status(200).json({ status: 'EVENT_RECEIVED' });
    } else {
      res.status(404).json({ error: 'Not a page webhook event' });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test route to send message manually
app.post('/send-message', async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    
    if (!recipientId || !message) {
      return res.status(400).json({ error: 'recipientId and message are required' });
    }
    
    const result = await sendMessage(recipientId, message);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════╗
║   Express Facebook Bot Server      ║
╠════════════════════════════════════╣
║  Port: ${PORT}                        ║
║  Environment: ${process.env.NODE_ENV || 'development'}        ║
║  Webhook URL: http://localhost:${PORT}/webhook ║
╚════════════════════════════════════╝
  `);
});

// Export for Vercel
module.exports = app;
