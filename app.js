// app.js - DEBUG MODE - Echoes everything as JSON
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();

// ============================================
// CONFIGURATION - Your tokens
// ============================================
const PAGE_ACCESS_TOKEN = 'EAAasEsQYWhMBQlPs0GvbYclJSO2pL6B8ZCIHM1GZAZB4FUnFTKTZAoYN5t8siykP9cpa2kEA4OkGQqpkLZB7PPXZBlHFaQBktcqtoKiitNCu7m3AexdGYxl1DhYXZB0ZCu5H5IfhJ9UVFk6Hs5pOxTZAZC4ZBEoSfPrZC9gJzchDgbUdmGDWHluZB1I5HIhfLS4bBCRbuYjLv2AZDZD';
const VERIFY_TOKEN = 'mytoken1';
const APP_SECRET = ''; // Optional: Add your app secret for verification

// ============================================
// MIDDLEWARE - Capture raw body for verification
// ============================================
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Debug logging middleware - Logs EVERYTHING
app.use((req, res, next) => {
  console.log('\n' + '='.repeat(80));
  console.log(`🔍 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  
  if (req.method === 'POST') {
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    console.log('📄 Raw Body:', req.rawBody);
  }
  
  if (req.query && Object.keys(req.query).length > 0) {
    console.log('🔎 Query:', JSON.stringify(req.query, null, 2));
  }
  
  console.log('='.repeat(80));
  next();
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Verify webhook signature (optional but recommended)
function verifySignature(req) {
  if (!APP_SECRET) return true;
  
  const signature = req.headers['x-hub-signature'];
  if (!signature) return false;
  
  const hmac = crypto.createHmac('sha1', APP_SECRET);
  const digest = 'sha1=' + hmac.update(req.rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Send message to Facebook
async function sendMessage(senderId, messageData) {
  try {
    console.log(`📤 Sending to ${senderId}:`, JSON.stringify(messageData, null, 2));
    
    const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
    
    const response = await axios.post(url, {
      recipient: { id: senderId },
      message: messageData,
      messaging_type: 'RESPONSE'
    });
    
    console.log('✅ Message sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending message:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Full error:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// ============================================
// ROUTES
// ============================================

// Root route - Status page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Facebook Bot Debug Mode</title>
        <style>
            body { font-family: Arial; padding: 20px; background: #f0f2f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            h1 { color: #1877f2; }
            .info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 10px 0; }
            .token { background: #f0f0f0; padding: 10px; border-radius: 5px; font-family: monospace; word-break: break-all; }
            .success { color: green; }
            .warning { color: orange; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 Facebook Bot Debug Mode</h1>
            <div class="info">
                <p><strong>Status:</strong> <span class="success">✅ RUNNING</span></p>
                <p><strong>Server Time:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Webhook URL:</strong> ${req.protocol}://${req.get('host')}/webhook</p>
                <p><strong>Verify Token:</strong> <code>${VERIFY_TOKEN}</code></p>
            </div>
            
            <h2>📋 Webhook Configuration</h2>
            <p>Use these settings in your Facebook App:</p>
            <div class="token">
                <strong>Callback URL:</strong> ${req.protocol}://${req.get('host')}/webhook<br>
                <strong>Verify Token:</strong> ${VERIFY_TOKEN}
            </div>
            
            <h2>🔍 Debug Information</h2>
            <p>All incoming webhooks will be logged to console and echoed back as JSON messages.</p>
            <p>Check your Vercel logs to see the full data:</p>
            <div class="token">
                vercel logs ${req.get('host')}
            </div>
            
            <h2>📱 Test Commands</h2>
            <p>Send any message to your page and the bot will echo back the full JSON structure.</p>
        </div>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    webhook_url: `https://${req.get('host')}/webhook`,
    verify_token: VERIFY_TOKEN,
    page_token_preview: PAGE_ACCESS_TOKEN.substring(0, 20) + '...'
  });
});

// Webhook verification (GET)
app.get('/webhook', (req, res) => {
  console.log('🔐 Webhook verification request');
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log(`Mode: ${mode}, Token: ${token}, Challenge: ${challenge}`);

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Verification failed');
    console.log(`Expected token: ${VERIFY_TOKEN}, Received: ${token}`);
    res.status(403).send('Verification failed');
  }
});

// Webhook for receiving messages (POST) - DEBUG MODE
app.post('/webhook', async (req, res) => {
  console.log('📨 WEBHOOK TRIGGERED - DEBUG MODE');
  
  try {
    // Verify signature if APP_SECRET is set
    if (APP_SECRET && !verifySignature(req)) {
      console.log('❌ Invalid signature');
      return res.status(401).send('Invalid signature');
    }

    const body = req.body;
    
    // ALWAYS return 200 OK immediately to prevent retries
    res.status(200).json({ 
      status: 'EVENT_RECEIVED',
      timestamp: new Date().toISOString(),
      mode: 'debug'
    });

    // Process asynchronously - this won't block the response
    setTimeout(async () => {
      try {
        console.log('🔄 Processing webhook data...');
        
        if (body.object === 'page') {
          for (const entry of body.entry) {
            console.log(`📌 Entry ID: ${entry.id}, Time: ${new Date(entry.time).toLocaleString()}`);
            
            if (entry.messaging) {
              for (const event of entry.messaging) {
                const senderId = event.sender.id;
                console.log(`👤 Sender: ${senderId}`);
                console.log(`📦 Full event:`, JSON.stringify(event, null, 2));
                
                // ECHO BACK THE ENTIRE EVENT AS JSON
                const responseMessage = {
                  text: JSON.stringify({
                    received_at: new Date().toISOString(),
                    sender: event.sender,
                    recipient: event.recipient,
                    timestamp: event.timestamp,
                    message: event.message || null,
                    postback: event.postback || null,
                    read: event.read || null,
                    delivery: event.delivery || null
                  }, null, 2)
                };
                
                // If message is too long, truncate it (Facebook has 2000 char limit)
                if (responseMessage.text.length > 2000) {
                  responseMessage.text = JSON.stringify({
                    error: 'Message too long',
                    preview: JSON.stringify(event).substring(0, 1000) + '...'
                  });
                }
                
                await sendMessage(senderId, responseMessage);
                
                // Also send a separate message with basic info
                await sendMessage(senderId, {
                  text: `✅ Message received!\nType: ${event.message ? 'message' : event.postback ? 'postback' : 'other'}\nTimestamp: ${new Date(event.timestamp).toLocaleString()}`
                });
              }
            }
            
            // Handle changes array (for other webhook events)
            if (entry.changes) {
              console.log('📊 Changes:', JSON.stringify(entry.changes, null, 2));
            }
          }
        } else {
          console.log('⚠️ Not a page webhook event:', body.object);
        }
      } catch (processError) {
        console.error('❌ Error processing webhook data:', processError);
      }
    }, 100); // Small delay to ensure response is sent first
    
  } catch (error) {
    console.error('❌ Error in webhook handler:', error);
    // Only send error if we haven't sent response yet
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Test endpoint to manually send messages
app.post('/test-send', async (req, res) => {
  const { recipientId, message } = req.body;
  
  if (!recipientId || !message) {
    return res.status(400).json({ error: 'recipientId and message required' });
  }
  
  console.log(`🧪 Test send to ${recipientId}`);
  const result = await sendMessage(recipientId, { text: message });
  res.json({ success: true, result });
});

// Get all webhook subscriptions
app.get('/webhook-subscriptions', async (req, res) => {
  try {
    const url = `https://graph.facebook.com/v21.0/me/subscribed_apps?access_token=${PAGE_ACCESS_TOKEN}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Debug endpoint to check token permissions
app.get('/debug-token', async (req, res) => {
  try {
    const url = `https://graph.facebook.com/debug_token?input_token=${PAGE_ACCESS_TOKEN}&access_token=${PAGE_ACCESS_TOKEN}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('\n' + '🔥'.repeat(40));
    console.log('🔥 DEBUG MODE FACEBOOK BOT');
    console.log('🔥'.repeat(40));
    console.log(`\n📡 Server: http://localhost:${PORT}`);
    console.log(`🔗 Webhook: http://localhost:${PORT}/webhook`);
    console.log(`🔑 Verify Token: ${VERIFY_TOKEN}`);
    console.log(`🔄 Page Token: ${PAGE_ACCESS_TOKEN.substring(0, 20)}...`);
    console.log('\n📝 Debug Features:');
    console.log('  • All webhook data logged to console');
    console.log('  • Echoes full JSON of every message back to user');
    console.log('  • Shows sender IDs and timestamps');
    console.log('  • Token debug endpoint available at /debug-token');
    console.log('  • Subscriptions check at /webhook-subscriptions');
    console.log('\n' + '🔥'.repeat(40) + '\n');
  });
}

module.exports = app;