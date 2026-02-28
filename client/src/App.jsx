import { useState } from "react";
import "./style.css";

function App() {

  const [code, setCode] = useState("");
  const [review, setReview] = useState("");
  const [status, setStatus] = useState("Waiting for code...");
  const [loading, setLoading] = useState(false);

  const clearCode = () => {
    setCode("");
    setReview("");
  };

  const analyzeCode = async () => {

    if (!code.trim()) return;

    setReview("");
    setStatus("Analyzing with Mistral...");
    setLoading(true);

    try {

      const response = await fetch("http://localhost:3000/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {

        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);

        const lines = chunk.split("\n\n");

        for (const line of lines) {

          if (line.startsWith("data: ")) {

            const json = JSON.parse(line.slice(6));

            if (json.response) {

              setReview(prev => prev + json.response);
            }
          }
        }
      }

      setStatus("Review Complete");

    } catch (error) {

      setStatus("Error: " + error.message);

    }

    setLoading(false);
  };



  return (

    <div className="container">

      <div className="header">
        <h1> 🤖 Offline Code Reviewer</h1>
        <p>Powered by Ollama (Mistral)</p>
      </div>

      <div className="main">

        <div className="card">

          <div className="card-header">
            <h3>Source Code</h3>
            <button onClick={clearCode}>Clear</button>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code here..."
          />

          <br /><br />

          <button onClick={analyzeCode}>
            Analyze Code
          </button>

        </div>

        <div className="card">

          <div className="card-header">
            <h3>Review Feedback</h3>
            <span className="status">{status}</span>
          </div>

          <div className="output">
            {review || "Review will appear here..."}
          </div>

        </div>

      </div>

    </div>

  );

}

export default App;
  
