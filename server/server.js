const express = require('express');
const cors = require('cors');
const {
  createReview,
  getAllReviews,
  getReviewById,
  updateReviewTitle,
  updateReviewRating,
  updateReviewLanguage,
  deleteReview,
  saveReviewSession,
  getReviewSessionByReviewId
} = require('./reviewer_database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `
You are a Senior Software Engineer doing a professional code review.

Give response in this EXACT format with these EXACT section headers:

FEEDBACK:
[3-5 lines of clear, specific feedback about the code]

IMPROVED CODE:
[Only if improvements needed, provide the corrected code. If code is already optimal write "Code is optimal."]

RATING:
Logic: [X/10]
Code Quality: [X/10]
Programming Knowledge: [X/10]

COMPLEXITY:
Time: [complexity]
Space: [complexity]

LANGUAGE:
[Detected programming language]

Keep it concise, accurate and professional.
`;

// ─── GET all reviews (for sidebar history) ───────────────────────────────────
app.get('/api/reviews', (req, res) => {
  try {
    const reviews = getAllReviews();
    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// ─── POST create new review ───────────────────────────────────────────────────
app.post('/api/reviews', (req, res) => {
  try {
    const reviewId = createReview();
    const review = getReviewById(reviewId);
    res.json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// ─── GET specific review with code and feedback ───────────────────────────────
app.get('/api/reviews/:id', (req, res) => {
  try {
    const { id } = req.params;
    const review = getReviewById(id);
    const session = getReviewSessionByReviewId(id);
    res.json({ review, session });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// ─── PATCH update review title ────────────────────────────────────────────────
app.patch('/api/reviews/:id/title', (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    updateReviewTitle(id, title);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update title' });
  }
});

// ─── DELETE a review ──────────────────────────────────────────────────────────
app.delete('/api/reviews/:id', (req, res) => {
  try {
    const { id } = req.params;
    deleteReview(id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// ─── POST analyze code (main review route) ────────────────────────────────────
app.post('/api/review', async (req, res) => {
  const { code, reviewId } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  if (!reviewId) {
    return res.status(400).json({ error: 'No reviewId provided' });
  }

  try {
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral',
        prompt: `${SYSTEM_PROMPT}\n\n---CODE TO REVIEW---\n${code}`,
        stream: true
      })
    });

    if (!ollamaResponse.ok) {
      throw new Error('Ollama server is not responding');
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const reader = ollamaResponse.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            fullResponse += parsed.response;
            res.write(`data: ${JSON.stringify({ response: parsed.response })}\n\n`);
          }
        } catch (err) {}
      }
    }

    // ── Save to DB after streaming done ────────────────────────────────────
    saveReviewSession(reviewId, code, fullResponse);

    // ── Extract rating from response ────────────────────────────────────────
    const ratingMatch = fullResponse.match(/Logic:\s*(\d+)\/10/);
    if (ratingMatch) {
      updateReviewRating(reviewId, parseInt(ratingMatch[1]));
    }

    // ── Extract language from response ──────────────────────────────────────
    const languageMatch = fullResponse.match(/LANGUAGE:\s*\n([^\n]+)/);
    if (languageMatch) {
      updateReviewLanguage(reviewId, languageMatch[1].trim());
    }

    // ── Auto generate title using code first line ───────────────────────────
    const firstLine = code.trim().split('\n')[0].slice(0, 40);
    const autoTitle = firstLine || 'Code Review';
    updateReviewTitle(reviewId, autoTitle);

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Server Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Reviewer Server running at http://localhost:${PORT}`);
});