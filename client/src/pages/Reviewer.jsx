import { useState, useEffect, useRef } from "react";
import "./Reviewer.css";

function Reviewer({ activeReviewId, setActiveReviewId, refreshReviews }) {

  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState("idle"); // idle | analyzing | done | error
  const [loading, setLoading] = useState(false);
  const [parsedFeedback, setParsedFeedback] = useState(null);
  const feedbackRef = useRef(null);

  // ─── Load review when activeReviewId changes ──────────────────────────────
  useEffect(() => {
    if (activeReviewId) {
      fetch(`http://localhost:3000/api/reviews/${activeReviewId}`)
        .then(res => res.json())
        .then(data => {
          if (data.session) {
            setCode(data.session.code);
            const parsed = parseFeedback(data.session.feedback);
            setParsedFeedback(parsed);
            setStatus("done");
          }
        })
        .catch(() => {});
    } else {
      setCode("");
      setFeedback("");
      setParsedFeedback(null);
      setStatus("idle");
    }
  }, [activeReviewId]);

  // ─── Auto scroll feedback ─────────────────────────────────────────────────
  useEffect(() => {
    if (feedbackRef.current) {
      feedbackRef.current.scrollTop = feedbackRef.current.scrollHeight;
    }
  }, [feedback]);

  // ─── Parse feedback into sections ────────────────────────────────────────
  const parseFeedback = (raw) => {
    const sections = {};

    const feedbackMatch = raw.match(/FEEDBACK:\n([\s\S]*?)(?=IMPROVED CODE:|RATING:|$)/);
    const codeMatch = raw.match(/IMPROVED CODE:\n([\s\S]*?)(?=RATING:|$)/);
    const ratingMatch = raw.match(/RATING:\n([\s\S]*?)(?=COMPLEXITY:|$)/);
    const complexityMatch = raw.match(/COMPLEXITY:\n([\s\S]*?)(?=LANGUAGE:|$)/);
    const languageMatch = raw.match(/LANGUAGE:\n([\s\S]*?)$/);

    if (feedbackMatch) sections.feedback = feedbackMatch[1].trim();
    if (codeMatch) sections.improvedCode = codeMatch[1].trim();
    if (ratingMatch) sections.rating = ratingMatch[1].trim();
    if (complexityMatch) sections.complexity = complexityMatch[1].trim();
    if (languageMatch) sections.language = languageMatch[1].trim();

    return sections;
  };

  // ─── Extract rating number for badge ─────────────────────────────────────
  const extractLogicRating = (ratingStr) => {
    if (!ratingStr) return null;
    const match = ratingStr.match(/Logic:\s*(\d+)\/10/);
    return match ? parseInt(match[1]) : null;
  };

  const getRatingColor = (rating) => {
    if (rating >= 8) return "#22c55e";
    if (rating >= 5) return "#f59e0b";
    return "#ef4444";
  };

  // ─── New Review ───────────────────────────────────────────────────────────
  const handleNewReview = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/reviews", {
        method: "POST"
      });
      const newReview = await res.json();
      setActiveReviewId(newReview.id);
      setCode("");
      setFeedback("");
      setParsedFeedback(null);
      setStatus("idle");
      if (refreshReviews) refreshReviews();
    } catch (error) {
      console.error("Failed to create new review:", error);
    }
  };

  // ─── Analyze Code ─────────────────────────────────────────────────────────
  const analyzeCode = async () => {
    if (!code.trim()) return;

    let currentReviewId = activeReviewId;

    // Auto create review session if none
    if (!currentReviewId) {
      try {
        const res = await fetch("http://localhost:3000/api/reviews", {
          method: "POST"
        });
        const newReview = await res.json();
        currentReviewId = newReview.id;
        setActiveReviewId(newReview.id);
        if (refreshReviews) refreshReviews();
      } catch (error) {
        console.error("Failed to create review:", error);
        return;
      }
    }

    setFeedback("");
    setParsedFeedback(null);
    setStatus("analyzing");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, reviewId: currentReviewId }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.response) {
                fullText += json.response;
                setFeedback(fullText);
              }
              if (json.done) {
                const parsed = parseFeedback(fullText);
                setParsedFeedback(parsed);
                setStatus("done");
                setTimeout(() => {
                  if (refreshReviews) refreshReviews();
                }, 500);
              }
            } catch (err) {}
          }
        }
      }

    } catch (error) {
      setStatus("error");
    }

    setLoading(false);
  };

  const clearAll = () => {
    setCode("");
    setFeedback("");
    setParsedFeedback(null);
    setStatus("idle");
    setActiveReviewId(null);
  };

  const logicRating = parsedFeedback ? extractLogicRating(parsedFeedback.rating) : null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="rv-wrapper">

      {/* ── Top Bar ── */}
      <div className="rv-topbar">
        <div className="rv-topbar-left">
          <span className="rv-topbar-icon">🔍</span>
          <span className="rv-topbar-title">Code Reviewer</span>
          <span className="rv-topbar-sub">Powered by Mistral</span>
        </div>
        <div className="rv-topbar-right">
          {status === "done" && logicRating && (
            <div
              className="rv-rating-badge"
              style={{ borderColor: getRatingColor(logicRating), color: getRatingColor(logicRating) }}
            >
              Logic {logicRating}/10
            </div>
          )}
          <button className="rv-new-btn" onClick={handleNewReview}>
            + New Review
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="rv-main">

        {/* ── Left Panel — Code Input ── */}
        <div className="rv-panel rv-left-panel">

          <div className="rv-panel-header">
            <div className="rv-panel-title">
              <span className="rv-dot rv-dot-blue"></span>
              Source Code
            </div>
            <button className="rv-clear-btn" onClick={clearAll}>
              Clear
            </button>
          </div>

          <div className="rv-editor-wrapper">
            <div className="rv-line-numbers">
              {code.split("\n").map((_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <textarea
              className="rv-code-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="// Paste your code here..."
              spellCheck={false}
            />
          </div>

          <div className="rv-panel-footer">
            <span className="rv-line-count">
              {code.split("\n").length} lines · {code.length} chars
            </span>
            <button
              className="rv-analyze-btn"
              onClick={analyzeCode}
              disabled={loading || !code.trim()}
            >
              {loading ? (
                <span className="rv-btn-loading">
                  <span></span><span></span><span></span>
                  Analyzing...
                </span>
              ) : (
                "▶ Analyze Code"
              )}
            </button>
          </div>

        </div>

        {/* ── Right Panel — Feedback ── */}
        <div className="rv-panel rv-right-panel">

          <div className="rv-panel-header">
            <div className="rv-panel-title">
              <span className="rv-dot rv-dot-purple"></span>
              Review Feedback
            </div>
            <span className={`rv-status rv-status-${status}`}>
              {status === "idle" && "Waiting for code..."}
              {status === "analyzing" && "⟳ Analyzing..."}
              {status === "done" && "✓ Review Complete"}
              {status === "error" && "✕ Error occurred"}
            </span>
          </div>

          <div className="rv-feedback-area" ref={feedbackRef}>

            {/* Empty state */}
            {status === "idle" && (
              <div className="rv-empty">
                <div className="rv-empty-icon">⌥</div>
                <p>Paste your code and click Analyze</p>
                <p className="rv-empty-sub">Supports all major programming languages</p>
              </div>
            )}

            {/* Streaming raw text while analyzing */}
            {status === "analyzing" && !parsedFeedback && (
              <pre className="rv-raw-stream">{feedback}</pre>
            )}

            {/* Parsed structured feedback */}
            {parsedFeedback && (
              <div className="rv-sections">

                {/* Feedback */}
                {parsedFeedback.feedback && (
                  <div className="rv-section">
                    <div className="rv-section-header">
                      <span className="rv-section-icon">💬</span>
                      Feedback
                    </div>
                    <p className="rv-section-text">{parsedFeedback.feedback}</p>
                  </div>
                )}

                {/* Improved Code */}
                {parsedFeedback.improvedCode && (
                  <div className="rv-section">
                    <div className="rv-section-header">
                      <span className="rv-section-icon">⚡</span>
                      Improved Code
                    </div>
                    <pre className="rv-code-block">{parsedFeedback.improvedCode}</pre>
                  </div>
                )}

                {/* Rating + Complexity side by side */}
                <div className="rv-metrics-row">

                  {parsedFeedback.rating && (
                    <div className="rv-metric-card">
                      <div className="rv-metric-title">
                        <span>⭐</span> Rating
                      </div>
                      <div className="rv-metric-content">
                        {parsedFeedback.rating.split("\n").map((line, i) => {
                          const match = line.match(/(\w[\w\s]*):\s*(\d+)\/10/);
                          if (match) {
                            const val = parseInt(match[2]);
                            const color = getRatingColor(val);
                            return (
                              <div key={i} className="rv-rating-row">
                                <span className="rv-rating-label">{match[1]}</span>
                                <div className="rv-rating-bar-wrap">
                                  <div
                                    className="rv-rating-bar"
                                    style={{ width: `${val * 10}%`, background: color }}
                                  ></div>
                                </div>
                                <span className="rv-rating-val" style={{ color }}>
                                  {match[2]}/10
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}

                  {parsedFeedback.complexity && (
                    <div className="rv-metric-card">
                      <div className="rv-metric-title">
                        <span>📊</span> Complexity
                      </div>
                      <div className="rv-metric-content">
                        {parsedFeedback.complexity.split("\n").map((line, i) => (
                          <div key={i} className="rv-complexity-row">
                            <span className="rv-complexity-label">{line.split(":")[0]}</span>
                            <span className="rv-complexity-val">{line.split(":")[1]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Language */}
                {parsedFeedback.language && (
                  <div className="rv-language-tag">
                    🏷 {parsedFeedback.language}
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

export default Reviewer;