const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'reviewer_history.db'));

// Enable foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT DEFAULT 'New Review',
    language TEXT DEFAULT 'Unknown',
    rating INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS review_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    feedback TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
  );
`);

// ─── Review Functions ────────────────────────────────────────────────────────

function createReview() {
  const stmt = db.prepare(`INSERT INTO reviews (title) VALUES ('New Review')`);
  const result = stmt.run();
  return result.lastInsertRowid;
}

function getAllReviews() {
  return db.prepare(`
    SELECT * FROM reviews ORDER BY created_at DESC
  `).all();
}

function getReviewById(id) {
  return db.prepare(`SELECT * FROM reviews WHERE id = ?`).get(id);
}

function updateReviewTitle(id, title) {
  db.prepare(`UPDATE reviews SET title = ? WHERE id = ?`).run(title, id);
}

function updateReviewRating(id, rating) {
  db.prepare(`UPDATE reviews SET rating = ? WHERE id = ?`).run(rating, id);
}

function updateReviewLanguage(id, language) {
  db.prepare(`UPDATE reviews SET language = ? WHERE id = ?`).run(language, id);
}

function deleteReview(id) {
  db.prepare(`DELETE FROM reviews WHERE id = ?`).run(id);
}

// ─── Review Session Functions ────────────────────────────────────────────────

function saveReviewSession(reviewId, code, feedback) {
  db.prepare(`
    INSERT INTO review_sessions (review_id, code, feedback)
    VALUES (?, ?, ?)
  `).run(reviewId, code, feedback);
}

function getReviewSessionByReviewId(reviewId) {
  return db.prepare(`
    SELECT * FROM review_sessions WHERE review_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(reviewId);
}

module.exports = {
  createReview,
  getAllReviews,
  getReviewById,
  updateReviewTitle,
  updateReviewRating,
  updateReviewLanguage,
  deleteReview,
  saveReviewSession,
  getReviewSessionByReviewId
};