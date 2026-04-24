const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'generator_history.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT DEFAULT 'New Generation',
    language TEXT DEFAULT 'Unknown',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS generation_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    generation_id INTEGER NOT NULL,
    prompt TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generation_id) REFERENCES generations(id) ON DELETE CASCADE
  );
`);

// ─── Generation Functions ────────────────────────────────────────────────────

function createGeneration() {
  const stmt = db.prepare(`INSERT INTO generations (title) VALUES ('New Generation')`);
  const result = stmt.run();
  return result.lastInsertRowid;
}

function getAllGenerations() {
  return db.prepare(`
    SELECT * FROM generations ORDER BY created_at DESC
  `).all();
}

function getGenerationById(id) {
  return db.prepare(`
    SELECT * FROM generations WHERE id = ?
  `).get(id);
}

function updateGenerationTitle(id, title) {
  db.prepare(`
    UPDATE generations SET title = ? WHERE id = ?
  `).run(title, id);
}

function updateGenerationLanguage(id, language) {
  db.prepare(`
    UPDATE generations SET language = ? WHERE id = ?
  `).run(language, id);
}

function deleteGeneration(id) {
  db.prepare(`DELETE FROM generations WHERE id = ?`).run(id);
}

// ─── Generation Session Functions ────────────────────────────────────────────

function saveGenerationSession(generationId, prompt, code) {
  db.prepare(`
    INSERT INTO generation_sessions (generation_id, prompt, code)
    VALUES (?, ?, ?)
  `).run(generationId, prompt, code);
}

function getGenerationSessionById(generationId) {
  return db.prepare(`
    SELECT * FROM generation_sessions
    WHERE generation_id = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(generationId);
}

function getAllSessionsByGenerationId(generationId) {
  return db.prepare(`
    SELECT * FROM generation_sessions
    WHERE generation_id = ?
    ORDER BY created_at ASC
  `).all(generationId);
}

module.exports = {
  createGeneration,
  getAllGenerations,
  getGenerationById,
  updateGenerationTitle,
  updateGenerationLanguage,
  deleteGeneration,
  saveGenerationSession,
  getGenerationSessionById,
  getAllSessionsByGenerationId
};