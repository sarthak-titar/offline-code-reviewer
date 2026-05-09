import { useState, useEffect, useRef } from "react";
import "./Compiler.css";

function Compiler() {
  const [code, setCode] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("python");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [runtimes, setRuntimes] = useState([]);
  const [duration, setDuration] = useState(null);
  const outputRef = useRef(null);

  useEffect(() => {
    fetchRuntimes();
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, error]);

  const fetchRuntimes = async () => {
    try {
      const res = await fetch("http://localhost:3003/api/compiler/runtimes");
      const data = await res.json();
      setRuntimes(data);
      if (data.length > 0) {
        setSelectedLanguage(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch runtimes:", err);
      setError("Failed to connect to compiler server. Make sure it is running on port 3003.");
    }
  };

  const runCode = async () => {
    if (!code.trim()) {
      setError("Please enter code to run");
      return;
    }

    const selectedRuntime = runtimes.find(r => r.id === selectedLanguage);
    if (!selectedRuntime) {
      setError("Selected language runtime not found");
      return;
    }
    if (!selectedRuntime.installed) {
      setError(`${selectedRuntime.name} runtime is not installed. Check your runtimes folder.`);
      return;
    }

    setLoading(true);
    setOutput("");
    setError("");
    setDuration(null);

    try {
      const res = await fetch("http://localhost:3003/api/compiler/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: selectedLanguage })
      });

      const result = await res.json();

      if (result.success) {
        setOutput(result.stdout || "(No output)");
        // Show stderr as warning if present but execution succeeded
        if (result.stderr) {
          setError(`Warning (stderr):\n${result.stderr}`);
        }
        setDuration(result.duration);
      } else {
        // ✅ Show the FULL error — not just "Execution failed"
        setError(result.error || "Unknown error occurred");
      }
    } catch (err) {
      setError(`Network error: ${err.message}\nMake sure compiler server is running on port 3003.`);
    }

    setLoading(false);
  };

  const handleClear = () => {
    setCode("");
    setOutput("");
    setError("");
    setDuration(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runCode();
    }
  };

  const getLanguageIcon = (langId) => {
    const icons = {
      python: "🐍",
      java: "☕",
      javascript: "⚡",
      cpp: "⚙️",
      c: "🔧"
    };
    return icons[langId] || "▶";
  };

  const getExampleCode = (lang) => {
    const examples = {
      python: `# Python Example\nprint("Hello, World!")\nnumbers = [1, 2, 3, 4, 5]\nprint("Sum:", sum(numbers))`,
      java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n        int sum = 1 + 2 + 3 + 4 + 5;\n        System.out.println("Sum: " + sum);\n    }\n}`,
      javascript: `// JavaScript Example\nconsole.log("Hello, World!");\nconst numbers = [1, 2, 3, 4, 5];\nconsole.log("Sum:", numbers.reduce((a, b) => a + b));`
    };
    return examples[lang] || "// Enter your code here";
  };

  return (
    <div className="compiler-wrapper">
      {/* Top Bar */}
      <div className="compiler-topbar">
        <div className="compiler-topbar-left">
          <span className="compiler-topbar-icon">▶</span>
          <span className="compiler-topbar-title">Code Compiler</span>
          <span className="compiler-topbar-sub">Execute Code Offline</span>
        </div>
        <div className="compiler-topbar-right">
          {duration !== null && (
            <div className="compiler-time-badge">⏱ {duration}s</div>
          )}
          <select
            className="compiler-language-select"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            {runtimes.map((runtime) => (
              <option key={runtime.id} value={runtime.id}>
                {getLanguageIcon(runtime.id)} {runtime.name} ({runtime.version})
                {!runtime.installed ? " ❌" : " ✅"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="compiler-main">
        {/* Left Panel */}
        <div className="compiler-panel compiler-left-panel">
          <div className="compiler-panel-header">
            <div className="compiler-panel-title">
              <span className="compiler-dot compiler-dot-green"></span>
              Code
            </div>
            <button className="compiler-clear-btn" onClick={handleClear}>Clear</button>
          </div>

          <textarea
            className="compiler-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getExampleCode(selectedLanguage)}
            spellCheck="false"
          />

          <div className="compiler-panel-footer">
            <span className="compiler-char-count">{code.length} characters</span>
            <button className="compiler-run-btn" onClick={runCode} disabled={loading}>
              {loading ? (
                <span className="compiler-btn-loading">
                  <span></span><span></span><span></span>
                  Running...
                </span>
              ) : (
                "▶ Run Code (Ctrl+Enter)"
              )}
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="compiler-panel compiler-right-panel">
          <div className="compiler-panel-header">
            <div className="compiler-panel-title">
              <span className="compiler-dot compiler-dot-blue"></span>
              Output
            </div>
            {error && <span className="compiler-error-badge">✕ Error</span>}
            {output && !error && <span className="compiler-success-badge">✓ Success</span>}
          </div>

          {error && (
            <div className="compiler-error-box">
              <div className="compiler-error-title">Error:</div>
              <pre className="compiler-output-text compiler-error-text">{error}</pre>
            </div>
          )}

          <div className="compiler-output-area" ref={outputRef}>
            {!output && !error && (
              <div className="compiler-empty">
                <div className="compiler-empty-icon">▶</div>
                <p>Run your code to see output</p>
                <p className="compiler-empty-sub">Press Ctrl+Enter or click Run Code</p>
              </div>
            )}
            {output && (
              <pre className="compiler-output-text">{output}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Compiler;