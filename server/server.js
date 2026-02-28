const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const SYSTEM_PROMPT = `

You are a Senior Software Engineer.
 

Give SHORT and ACCURATE code review in this STRICT format:

1) Short Feedback  (max 5-6 lines, simple language)

2) Optimal / Counter Example (if improvement possible)
   - Provide corrected or improved code only if needed 

3) Rating (out of 10) based on:
   - Logic
   - Code Quality
   - Programming Knowledge

4) Time Complexity

5) Space Complexity

Keep response concise, structured, and clean.
Do NOT give long explanations.
`;

app.post('/api/review', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "No code provided" });
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
      throw new Error("Ollama server is not responding");
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const reader = ollamaResponse.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const parsed = JSON.parse(line);

          if (parsed.response) {
            res.write(`data: ${JSON.stringify({ response: parsed.response })}\n\n`);
          }
        } catch (err) {}
      }
    }

    res.end();

  } catch (error) {
    console.error("Server Error:", error);

    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});