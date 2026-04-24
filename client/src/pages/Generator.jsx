import { useState, useEffect, useRef } from "react";
import "./Generator.css";

function Generator({ activeGenerationId, setActiveGenerationId, refreshGenerations }) {

  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("idle"); // idle | generating | done | error
  const [loading, setLoading] = useState(false);
  const [parsedOutput, setParsedOutput] = useState(null);
  const [rawOutput, setRawOutput] = useState("");
  const [genTime, setGenTime] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const outputRef = useRef(null);
  const startTimeRef = useRef(null);

  // ─── Load generation when activeGenerationId changes ─────────────────────
  useEffect(() => {
    if (activeGenerationId) {
      fetch(`http://localhost:3001/api/generations/${activeGenerationId}`)
        .then(res => res.json())
        .then(data => {
          if (data.session) {
            setPrompt(data.session.prompt);
            const parsed = parseOutput(data.session.code);
            setParsedOutput(parsed);
            setStatus("done");
          }
        })
        .catch(() => {});
    } else {
      setPrompt("");
      setRawOutput("");
      setParsedOutput(null);
      setStatus("idle");
      setGenTime(null);
    }
  }, [activeGenerationId]);

  // ─── Auto scroll output ───────────────────────────────────────────────────
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [rawOutput]);

  // ─── Parse output into sections ──────────────────────────────────────────
  const parseOutput = (raw) => {
    const sections = {};

    const languageMatch = raw.match(/LANGUAGE:\s*\n([^\n]+)/);
    const explanationMatch = raw.match(
      /EXPLANATION:\s*\n([\s\S]*?)(?=CODE:|$)/
    );
    const codeMatch = raw.match(/CODE:\s*\n([\s\S]*?)(?=USAGE:|$)/);
    const usageMatch = raw.match(/USAGE:\s*\n([\s\S]*?)$/);

    if (languageMatch) sections.language = languageMatch[1].trim();
    if (explanationMatch) sections.explanation = explanationMatch[1].trim();
    if (codeMatch) sections.code = codeMatch[1].trim();
    if (usageMatch) sections.usage = usageMatch[1].trim();

    return sections;
  };

  // ─── Copy to clipboard ────────────────────────────────────────────────────
  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  // ─── New Generation ───────────────────────────────────────────────────────
  const handleNewGeneration = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/generations", {
        method: "POST"
      });
      const newGen = await res.json();
      setActiveGenerationId(newGen.id);
      setPrompt("");
      setRawOutput("");
      setParsedOutput(null);
      setStatus("idle");
      setGenTime(null);
      if (refreshGenerations) refreshGenerations();
    } catch (error) {
      console.error("Failed to create new generation:", error);
    }
  };

  // ─── Generate Code ────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    let currentGenerationId = activeGenerationId;

    if (!currentGenerationId) {
      try {
        const res = await fetch("http://localhost:3001/api/generations", {
          method: "POST"
        });
        const newGen = await res.json();
        currentGenerationId = newGen.id;
        setActiveGenerationId(newGen.id);
        if (refreshGenerations) refreshGenerations();
      } catch (error) {
        console.error("Failed to create generation:", error);
        return;
      }
    }

    setRawOutput("");
    setParsedOutput(null);
    setStatus("generating");
    setLoading(true);
    setGenTime(null);
    startTimeRef.current = Date.now();

    try {
      const res = await fetch("http://localhost:3001/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, generationId: currentGenerationId })
      });

      if (!res.ok) throw new Error("Server not responding");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.trim()) continue;
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.response) {
                fullText += json.response;
                setRawOutput(fullText);
              }
              if (json.done) {
                const parsed = parseOutput(fullText);
                setParsedOutput(parsed);
                setStatus("done");
                const elapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
                setGenTime(elapsed);
                setTimeout(() => {
                  if (refreshGenerations) refreshGenerations();
                }, 500);
              }
            } catch (err) {}
          }
        }
      }

    } catch (error) {
      setStatus("error");
      setRawOutput("Error: " + error.message);
    }

    setLoading(false);
  };

  // ─── Enter to generate ────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const clearAll = () => {
    setPrompt("");
    setRawOutput("");
    setParsedOutput(null);
    setStatus("idle");
    setGenTime(null);
    setActiveGenerationId(null);
  };

  // ─── Line numbers helper ──────────────────────────────────────────────────
  const getLineNumbers = (code) => {
    return code.split("\n").map((_, i) => i + 1);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="gn-wrapper">

      {/* ── Top Bar ── */}
      <div className="gn-topbar">
        <div className="gn-topbar-left">
          <span className="gn-topbar-icon">⚡</span>
          <span className="gn-topbar-title">Code Generator</span>
          <span className="gn-topbar-sub">Powered by Mistral</span>
        </div>
        <div className="gn-topbar-right">
          {genTime && (
            <div className="gn-time-badge">
              ⏱ {genTime}s
            </div>
          )}
          {parsedOutput?.language && (
            <div className="gn-lang-badge">
              {parsedOutput.language}
            </div>
          )}
          <button className="gn-new-btn" onClick={handleNewGeneration}>
            + New Generation
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="gn-main">

        {/* ── Left Panel — Prompt Input ── */}
        <div className="gn-panel gn-left-panel">

          <div className="gn-panel-header">
            <div className="gn-panel-title">
              <span className="gn-dot gn-dot-green"></span>
              Prompt
            </div>
            <button className="gn-clear-btn" onClick={clearAll}>
              Clear
            </button>
          </div>

          {/* Prompt textarea */}
          <div className="gn-prompt-wrapper">
            <textarea
              className="gn-prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                `Examples:\n` +
                `→ Binary search in Java\n` +
                `→ REST API in Node.js with Express\n` +
                `→ Merge sort in Python\n` +
                `→ Login form in React`
              }
              spellCheck={false}
            />
          </div>

          {/* Quick prompt chips */}
          <div className="gn-chips-area">
            <span className="gn-chips-label">Quick prompts:</span>
            <div className="gn-chips">
              {[
                "Binary Search in Java",
                "REST API in Node.js",
                "Merge Sort in Python",
                "Login form in React",
                "Linked List in C++"
              ].map((chip, i) => (
                <button
                  key={i}
                  className="gn-chip"
                  onClick={() => setPrompt(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="gn-panel-footer">
            <span className="gn-char-count">
              {prompt.length} chars
            </span>
            <button
              className="gn-generate-btn"
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
            >
              {loading ? (
                <span className="gn-btn-loading">
                  <span></span><span></span><span></span>
                  Generating...
                </span>
              ) : (
                "▶ Generate Code"
              )}
            </button>
          </div>

        </div>

        {/* ── Right Panel — Output ── */}
        <div className="gn-panel gn-right-panel">

          <div className="gn-panel-header">
            <div className="gn-panel-title">
              <span className="gn-dot gn-dot-blue"></span>
              Output
            </div>
            <span className={`gn-status gn-status-${status}`}>
              {status === "idle" && "Waiting for prompt..."}
              {status === "generating" && "⟳ Generating..."}
              {status === "done" && "✓ Generation Complete"}
              {status === "error" && "✕ Error occurred"}
            </span>
          </div>

          <div className="gn-output-area" ref={outputRef}>

            {/* Empty state */}
            {status === "idle" && (
              <div className="gn-empty">
                <div className="gn-empty-icon">⚡</div>
                <p>Enter a prompt and click Generate</p>
                <p className="gn-empty-sub">
                  Supports Java, Python, JavaScript, C++, and more
                </p>
              </div>
            )}

            {/* Streaming raw while generating */}
            {status === "generating" && !parsedOutput && (
              <pre className="gn-raw-stream">{rawOutput}</pre>
            )}

            {/* Parsed structured output */}
            {parsedOutput && (
              <div className="gn-sections">

                {/* Explanation */}
                {parsedOutput.explanation && (
                  <div className="gn-section">
                    <div className="gn-section-header">
                      <span className="gn-section-icon">💬</span>
                      Explanation
                    </div>
                    <p className="gn-section-text">
                      {parsedOutput.explanation}
                    </p>
                  </div>
                )}

                {/* Code Block */}
                {parsedOutput.code && (
                  <div className="gn-section">

                    <div className="gn-section-header">
                      <div className="gn-code-header-left">
                        <span className="gn-section-icon">📄</span>
                        Code
                        {parsedOutput.language && (
                          <span className="gn-code-lang-tag">
                            {parsedOutput.language}
                          </span>
                        )}
                      </div>
                      <button
                        className={`gn-copy-btn ${copiedIndex === 0 ? "copied" : ""}`}
                        onClick={() => handleCopy(parsedOutput.code, 0)}
                      >
                        {copiedIndex === 0 ? "✓ Copied!" : "⎘ Copy"}
                      </button>
                    </div>

                    {/* Code with line numbers */}
                    <div className="gn-code-wrapper">
                      <div className="gn-line-numbers">
                        {getLineNumbers(parsedOutput.code).map((num) => (
                          <span key={num}>{num}</span>
                        ))}
                      </div>
                      <pre className="gn-code-block">
                        {parsedOutput.code}
                      </pre>
                    </div>

                  </div>
                )}

                {/* Usage */}
                {parsedOutput.usage && (
                  <div className="gn-section">
                    <div className="gn-section-header">
                      <div className="gn-code-header-left">
                        <span className="gn-section-icon">▶</span>
                        How to Run
                      </div>
                      <button
                        className={`gn-copy-btn ${copiedIndex === 1 ? "copied" : ""}`}
                        onClick={() => handleCopy(parsedOutput.usage, 1)}
                      >
                        {copiedIndex === 1 ? "✓ Copied!" : "⎘ Copy"}
                      </button>
                    </div>
                    <pre className="gn-usage-block">
                      {parsedOutput.usage}
                    </pre>
                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

export default Generator;