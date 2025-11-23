const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuration
const CONFIG = {
  // Add specific user IDs that the bot should react to
  ALLOWED_USERS: [
    'user_id_1',
    'user_id_2', 
    'user_id_3'
    // Add your specific user IDs here
  ],
  
  // Responses for specific users
  USER_RESPONSES: {
    'user_id_1': 'Hello VIP User! How can I help you today?',
    'user_id_2': 'Welcome back, special user!',
    'user_id_3': 'Hey! Good to see you again!',
    'default': 'Sorry, I only respond to specific users.'
  },
  
  // Keywords and responses
  KEYWORD_RESPONSES: {
    'hello': 'Hello there!',
    'help': 'I can help you with basic queries!',
    'time': `Current time is: ${new Date().toLocaleTimeString()}`,
    'status': 'Bot is running smoothly!'
  }
};

// Health check endpoint for Uptime Robot
app.get('/', (req, res) => {
  res.json({ 
    status: 'Bot is running', 
    timestamp: new Date().toISOString(),
    users: CONFIG.ALLOWED_USERS.length
  });
});

// Webhook endpoint for receiving messages
app.post('/webhook', async (req, res) => {
  try {
    const { body } = req;
    
    // Log incoming request
    console.log('Received webhook:', JSON.stringify(body, null, 2));
    
    // Process message based on your platform's webhook structure
    const messageData = extractMessageData(body);
    
    if (messageData && shouldRespondToUser(messageData.userId)) {
      await handleUserMessage(messageData);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Function to extract message data (adapt based on your platform)
function extractMessageData(body) {
  // This is a generic structure - adapt based on your messaging platform
  // For Facebook Messenger, Telegram, etc., structure will differ
  
  if (body.entry && body.entry[0].messaging) {
    // Facebook Messenger structure
    const messaging = body.entry[0].messaging[0];
    return {
      userId: messaging.sender.id,
      message: messaging.message.text,
      timestamp: messaging.timestamp
    };
  } else if (body.message) {
    // Telegram structure
    return {
      userId: body.message.from.id.toString(),
      message: body.message.text,
      timestamp: body.message.date
    };
  } else {
    // Custom structure
    return {
      userId: body.userId || body.sender_id,
      message: body.message || body.text,
      timestamp: body.timestamp || Date.now()
    };
  }
}

// Check if bot should respond to this user
function shouldRespondToUser(userId) {
  return CONFIG.ALLOWED_USERS.includes(userId.toString());
}

// Handle user message and send response
async function handleUserMessage(messageData) {
  const { userId, message } = messageData;
  
  let responseText = CONFIG.USER_RESPONSES.default;
  
  // Check for specific user responses
  if (CONFIG.USER_RESPONSES[userId]) {
    responseText = CONFIG.USER_RESPONSES[userId];
  }
  
  // Check for keyword matches
  const lowerMessage = message.toLowerCase();
  for (const [keyword, response] of Object.entries(CONFIG.KEYWORD_RESPONSES)) {
    if (lowerMessage.includes(keyword)) {
      responseText = response;
      break;
    }
  }
  
  // Send response back to user
  await sendMessage(userId, responseText);
}

// Function to send message (adapt based on your platform)
async function sendMessage(userId, message) {
  try {
    // This is a generic send function - adapt for your platform
    // For Facebook Messenger, you'd use the Send API
    // For Telegram, you'd use the sendMessage method
    
    console.log(`Sending to ${userId}: ${message}`);
    
    // Example for custom implementation:
    if (process.env.MESSAGING_PLATFORM === 'facebook') {
      await sendFacebookMessage(userId, message);
    } else if (process.env.MESSAGING_PLATFORM === 'telegram') {
      await sendTelegramMessage(userId, message);
    } else {
      // Custom webhook response
      await sendCustomMessage(userId, message);
    }
    
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Platform-specific send functions
async function sendFacebookMessage(userId, message) {
  const pageToken = process.env.FACEBOOK_PAGE_TOKEN;
  
  const response = await axios.post(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${pageToken}`,
    {
      recipient: { id: userId },
      message: { text: message }
    }
  );
  
  return response.data;
}

async function sendTelegramMessage(userId, message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  const response = await axios.post(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      chat_id: userId,
      text: message
    }
  );
  
  return response.data;
}

async function sendCustomMessage(userId, message) {
  // Implement your custom messaging platform logic here
  console.log(`Custom message to ${userId}: ${message}`);
}

// Admin endpoints to manage allowed users
app.get('/admin/users', (req, res) => {
  res.json({ allowedUsers: CONFIG.ALLOWED_USERS });
});

app.post('/admin/users', (req, res) => {
  const { userId } = req.body;
  
  if (userId && !CONFIG.ALLOWED_USERS.includes(userId)) {
    CONFIG.ALLOWED_USERS.push(userId);
    res.json({ success: true, message: 'User added', users: CONFIG.ALLOWED_USERS });
  } else {
    res.status(400).json({ success: false, message: 'User already exists or invalid userId' });
  }
});

app.delete('/admin/users/:userId', (req, res) => {
  const { userId } = req.params;
  const index = CONFIG.ALLOWED_USERS.indexOf(userId);
  
  if (index > -1) {
    CONFIG.ALLOWED_USERS.splice(index, 1);
    res.json({ success: true, message: 'User removed', users: CONFIG.ALLOWED_USERS });
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
  console.log(`Allowed users: ${CONFIG.ALLOWED_USERS.join(', ')}`);
  console.log(`Health check: http://localhost:${PORT}`);
});
