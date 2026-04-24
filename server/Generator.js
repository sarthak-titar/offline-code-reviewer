const express = require("express");
const cors = require("cors");
const {
  createGeneration,
  getAllGenerations,
  getGenerationById,
  updateGenerationTitle,
  updateGenerationLanguage,
  deleteGeneration,
  saveGenerationSession,
  getGenerationSessionById,
  getAllSessionsByGenerationId
} = require("./generator_database");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `
You are a Senior Software Engineer.

When generating code follow this EXACT format:

LANGUAGE:
[Programming language name only]

EXPLANATION:
[2-3 lines explaining what the code does]

CODE:
[Generated clean working code here]

USAGE:
[1-2 lines on how to run or use the code]

Rules:
- Generate clean, optimal, production-ready code
- Add helpful comments inside code
- No extra explanations outside the format
- Keep it concise and professional
`;

// ─── GET all generations (sidebar history) ────────────────────────────────────
app.get("/api/generations", (req, res) => {
  try {
    const generations = getAllGenerations();
    res.json(generations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch generations" });
  }
});

// ─── POST create new generation ───────────────────────────────────────────────
app.post("/api/generations", (req, res) => {
  try {
    const generationId = createGeneration();
    const generation = getGenerationById(generationId);
    res.json(generation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create generation" });
  }
});

// ─── GET specific generation with prompt and code ─────────────────────────────
app.get("/api/generations/:id", (req, res) => {
  try {
    const { id } = req.params;
    const generation = getGenerationById(id);
    const session = getGenerationSessionById(id);
    res.json({ generation, session });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch generation" });
  }
});

// ─── PATCH update generation title ───────────────────────────────────────────
app.patch("/api/generations/:id/title", (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    updateGenerationTitle(id, title);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update title" });
  }
});

// ─── DELETE a generation ──────────────────────────────────────────────────────
app.delete("/api/generations/:id", (req, res) => {
  try {
    const { id } = req.params;
    deleteGeneration(id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete generation" });
  }
});

// ─── POST generate code (main route) ─────────────────────────────────────────
app.post("/api/generate", async (req, res) => {
  const { prompt, generationId } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  if (!generationId) {
    return res.status(400).json({ error: "generationId is required" });
  }

  try {
    const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral",
        prompt: `${SYSTEM_PROMPT}\n\nUser Request:\n${prompt}`,
        stream: true
      })
    });

    if (!ollamaResponse.ok) {
      throw new Error("Ollama server is not responding");
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    const reader = ollamaResponse.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.response) {
            fullResponse += json.response;
            res.write(
              `data: ${JSON.stringify({ response: json.response })}\n\n`
            );
          }
        } catch (err) {}
      }
    }

    // ── Save to DB after streaming done ──────────────────────────────────────
    saveGenerationSession(generationId, prompt, fullResponse);

    // ── Extract language from response ────────────────────────────────────────
    const languageMatch = fullResponse.match(/LANGUAGE:\s*\n([^\n]+)/);
    if (languageMatch) {
      updateGenerationLanguage(generationId, languageMatch[1].trim());
    }

    // ── Auto generate title from prompt ──────────────────────────────────────
    const autoTitle = prompt.trim().slice(0, 45);
    updateGenerationTitle(generationId, autoTitle);

    // ── Send done signal ──────────────────────────────────────────────────────
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (error) {
    console.error("Server Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to connect to Ollama" });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Generator Server running on http://localhost:${PORT}`);
});