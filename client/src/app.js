import { useState } from 'react'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import './App.css'

function App() {

  const [code, setCode] = useState('')
  const [review, setReview] = useState('')
  const [status, setStatus] = useState('Waiting...')

  const analyzeCode = async () => {

    setReview('')
    setStatus("Analyzing...")

    const response = await fetch('http://localhost:3000/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {

      const { done, value } = await reader.read()

      if (done) break

      const chunk = decoder.decode(value)

      const lines = chunk.split("\n")

      for (const line of lines) {

        if (line.startsWith("data: ")) {

          const json = JSON.parse(line.slice(6))

          setReview(prev =>
            prev + marked.parse(json.response)
          )
        }
      }
    }

    setStatus("Complete")
  }

  return (
    <div className="container">

      <h1>Offline Code Reviewer</h1>

      <textarea
        value={code}
        onChange={e => setCode(e.target.value)}
      />

      <button onClick={analyzeCode}>
        Analyze
      </button>

      <div>{status}</div>

      <div
        dangerouslySetInnerHTML={{ __html: review }}
      />

    </div>
  )
}

export default App