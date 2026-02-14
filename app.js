// app.js - Express.js Facebook Bot (Fixed Version)
const express = require('express');
const axios = require('axios');

const app = express();

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const PAGE_ACCESS_TOKEN = 'EAAasEsQYWhMBQp4u4BlIZBweJmJUGpTsXSlKH66Rme2Y65TUlJM0LwfrrXLZCCZB9KOkp3e645EtjQflkDhAi3ZB7RNHrHmGinQUsBuleC0YZAIHzORdB6Lod01yxnocrFOa0guiGO8bW3AFEnA4fDd67CjZArgdW2LNWElCZCZCJES7sBulBg70h4ZBLK4S73xuhGSXvsAZDZD';
const VERIFY_TOKEN = 'mytoken'; // MUST match what you put in Facebook App

// ============================================
// MIDDLEWARE
// ============================================
// IMPORTANT: Use raw body for verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Simple logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Query:', req.query);
  console.log('Headers:', req.headers);
  next();
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Send message to Facebook
async function sendMessage(senderId, messageText) {
  try {
    console.log(`Sending message to ${senderId}: "${messageText}"`);
    
    const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
    
    const response = await axios.post(url, {
      recipient: { id: senderId },
      message: { text: messageText }
    });
    
    console.log('✅ Message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending message:', error.response?.data || error.message);
    return null;
  }
}

// ============================================
// ROUTES
// ============================================

// Root route - for testing
app.get('/', (req, res) => {
  res.send(`
    <h1>Facebook Bot is Running! 🤖</h1>
    <p>Webhook URL: ${req.protocol}://${req.get('host')}/webhook</p>
    <p>Verify Token: ${VERIFY_TOKEN}</p>
    <p>Server Time: ${new Date().toLocaleString()}</p>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    time: new Date().toISOString(),
    webhook_url: `https://${req.get('host')}/webhook`,
    verify_token: VERIFY_TOKEN
  });
});

// Facebook webhook verification (GET)
app.get('/webhook', (req, res) => {
  console.log('🔍 Webhook verification request received');
  console.log('Query params:', req.query);
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log(`Mode: ${mode}, Token: ${token}, Challenge: ${challenge}`);

  // Check if all required params exist
  if (!mode || !token || !challenge) {
    console.log('❌ Missing parameters');
    return res.status(400).send('Missing parameters');
  }

  // Verify the token
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully!');
    console.log(`Returning challenge: ${challenge}`);
    res.status(200).send(challenge);
  } else {
    console.log('❌ Verification failed');
    console.log(`Expected token: ${VERIFY_TOKEN}, Received token: ${token}`);
    res.status(403).send('Verification failed');
  }
});

// Facebook webhook for messages (POST)
app.post('/webhook', async (req, res) => {
  console.log('📨 Received webhook POST');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  try {
    const body = req.body;

    // Check if this is a page webhook event
    if (body.object === 'page') {
      // Iterate over each entry
      for (const entry of body.entry) {
        // Iterate over each messaging event
        for (const event of entry.messaging) {
          console.log('Processing event:', JSON.stringify(event, null, 2));
          
          const senderId = event.sender.id;
          
          // Handle message
          if (event.message) {
            const messageText = event.message.text;
            console.log(`📝 Message from ${senderId}: "${messageText}"`);
            
            // Check for /help command
            if (messageText && messageText.toLowerCase() === '/help') {
              await sendMessage(senderId, '🤖 Help Menu:\n• /help - Show this menu\n• /about - About this bot\n• /time - Current time\n• hi - Say hello');
            }
            // Check for /about
            else if (messageText && messageText.toLowerCase() === '/about') {
              await sendMessage(senderId, 'This is a Facebook bot running on Express.js!');
            }
            // Check for /time
            else if (messageText && messageText.toLowerCase() === '/time') {
              const time = new Date().toLocaleString();
              await sendMessage(senderId, `Current time: ${time}`);
            }
            // Check for hi/hello
            else if (messageText && (messageText.toLowerCase() === 'hi' || messageText.toLowerCase() === 'hello')) {
              await sendMessage(senderId, 'Hello! 👋 Type /help to see available commands.');
            }
            // Default response
            else if (messageText) {
              await sendMessage(senderId, `You said: "${messageText}". Type /help for commands.`);
            }
          }
          
          // Handle postback (button clicks)
          if (event.postback) {
            console.log(`🔘 Postback from ${senderId}:`, event.postback);
            await sendMessage(senderId, `You clicked: ${event.postback.payload}`);
          }
        }
      }

      // Return success
      res.status(200).json({ status: 'EVENT_RECEIVED' });
    } else {
      console.log('❌ Not a page webhook event');
      res.status(404).json({ error: 'Not a page webhook event' });
    }
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test endpoint to manually send a message
app.post('/test-send', async (req, res) => {
  const { recipientId, message } = req.body;
  
  if (!recipientId || !message) {
    return res.status(400).json({ error: 'recipientId and message required' });
  }
  
  const result = await sendMessage(recipientId, message);
  res.json({ success: true, result });
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Route not found');
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;

// Only start server if not in Vercel
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║    Express Facebook Bot Server            ║
╠═══════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}  ║
║  Webhook URL: http://localhost:${PORT}/webhook ║
║  Verify Token: ${VERIFY_TOKEN}                   ║
║  Test your bot:                            ║
║  1. Go to Facebook App dashboard           ║
║  2. Set webhook URL to your server URL     ║
║  3. Use token: ${VERIFY_TOKEN}                    ║
╚═══════════════════════════════════════════╝
    `);
  });
}

// Export for Vercel
module.exports = app;