const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'chat_history.db'));

// Create tables if not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT DEFAULT 'New Chat',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
  );
`);

// --- Chat Functions ---

function createChat() {
  const stmt = db.prepare(`INSERT INTO chats (title) VALUES ('New Chat')`);
  const result = stmt.run();
  return result.lastInsertRowid;
}

function getAllChats() {
  return db.prepare(`
    SELECT * FROM chats ORDER BY created_at DESC
  `).all();
}

function getChatById(id) {
  return db.prepare(`SELECT * FROM chats WHERE id = ?`).get(id);
}

function updateChatTitle(id, title) {
  db.prepare(`UPDATE chats SET title = ? WHERE id = ?`).run(title, id);
}

function deleteChat(id) {
  db.prepare(`DELETE FROM chats WHERE id = ?`).run(id);
}

// --- Message Functions ---

function saveMessage(chatId, role, content) {
  db.prepare(`
    INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)
  `).run(chatId, role, content);
}

function getMessagesByChatId(chatId) {
  return db.prepare(`
    SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC
  `).all(chatId);
}

module.exports = {
  createChat,
  getAllChats,
  getChatById,
  updateChatTitle,
  deleteChat,
  saveMessage,
  getMessagesByChatId
};