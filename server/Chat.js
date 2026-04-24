const express = require('express');
const cors = require('cors');
const {
  createChat,
  getAllChats,
  getChatById,
  updateChatTitle,
  deleteChat,
  saveMessage,
  getMessagesByChatId
} = require('./database');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `
You are a smart chatbot.
Give clear and helpful answers.
`;

// ─── GET all chats (for sidebar history) ───────────────────────────────────
app.get('/api/chats', (req, res) => {
  try {
    const chats = getAllChats();
    res.json(chats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// ─── POST create new chat ───────────────────────────────────────────────────
app.post('/api/chats', (req, res) => {
  try {
    const chatId = createChat();
    const chat = getChatById(chatId);
    res.json(chat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

// ─── GET messages of a specific chat ───────────────────────────────────────
app.get('/api/chats/:id/messages', (req, res) => {
  try {
    const { id } = req.params;
    const messages = getMessagesByChatId(id);
    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ─── PATCH update chat title ────────────────────────────────────────────────
app.patch('/api/chats/:id/title', (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    updateChatTitle(id, title);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update title' });
  }
});

// ─── DELETE a chat ──────────────────────────────────────────────────────────
app.delete('/api/chats/:id', (req, res) => {
  try {
    const { id } = req.params;
    deleteChat(id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// ─── POST generate title using Mistral ─────────────────────────────────────
app.post('/api/generate-title', async (req, res) => {
  const { messages } = req.body;

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided' });
  }

  // Build a short conversation summary for Mistral
  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  try {
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral',
        prompt: `Based on this conversation, give a very short title (max 5 words, no quotes, no punctuation):\n\n${conversationText}\n\nTitle:`,
        stream: false
      })
    });

    const data = await ollamaResponse.json();
    const title = data.response.trim().slice(0, 50); // max 50 chars safety
    res.json({ title });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate title' });
  }
});

// ─── POST send message (main chat) ─────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, chatId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'No message provided' });
  }

  if (!chatId) {
    return res.status(400).json({ error: 'No chatId provided' });
  }

  // Save user message to DB
  saveMessage(chatId, 'user', message);

  // Get previous messages for context
  const history = getMessagesByChatId(chatId);

  // Build conversation context for Mistral
  const conversationContext = history
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  try {
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral',
        prompt: `${SYSTEM_PROMPT}\n\n${conversationContext}\nAssistant:`,
        stream: false
      })
    });

    const data = await ollamaResponse.json();
    const reply = data.response.trim();

    // Save assistant message to DB
    saveMessage(chatId, 'assistant', reply);

    // After 2nd user message, auto generate title
    const userMessages = history.filter(m => m.role === 'user');
    if (userMessages.length === 1) {
      // This was the first message, generate title in background
      const allMessages = getMessagesByChatId(chatId);
      const conversationText = allMessages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral',
          prompt: `Based on this conversation, give a very short title (max 5 words, no quotes, no punctuation):\n\n${conversationText}\n\nTitle:`,
          stream: false
        })
      }).then(r => r.json()).then(titleData => {
        const title = titleData.response.trim().slice(0, 50);
        updateChatTitle(chatId, title);
      }).catch(err => console.error('Title generation failed:', err));
    }

    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: 'Error connecting to Ollama' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Chat Server running at http://localhost:${PORT}`);
});