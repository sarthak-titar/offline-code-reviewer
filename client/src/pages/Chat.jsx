import React, { useState, useEffect, useRef } from "react";
import "./Chat.css";

function Chat({ activeChatId, setActiveChatId, refreshChats }) {

  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // ─── Load messages when activeChatId changes ──────────────────────────────
  useEffect(() => {
    if (activeChatId) {
      fetch(`http://localhost:3002/api/chats/${activeChatId}/messages`)
        .then(res => res.json())
        .then(data => setMessages(data))
        .catch(() => setMessages([]));
    } else {
      setMessages([]);
    }
  }, [activeChatId]);

  // ─── Auto scroll to bottom on new message ────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ─── Create new chat ──────────────────────────────────────────────────────
  const handleNewChat = async () => {
    try {
      const res = await fetch("http://localhost:3002/api/chats", {
        method: "POST"
      });
      const newChat = await res.json();
      setActiveChatId(newChat.id);
      setMessages([]);
      if (refreshChats) refreshChats();
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  // ─── Send message ─────────────────────────────────────────────────────────
  const handleSend = async () => {

    if (!prompt.trim()) return;

    // If no active chat, create one first
    let currentChatId = activeChatId;
    if (!currentChatId) {
      try {
        const res = await fetch("http://localhost:3002/api/chats", {
          method: "POST"
        });
        const newChat = await res.json();
        currentChatId = newChat.id;
        setActiveChatId(newChat.id);
        if (refreshChats) refreshChats();
      } catch (error) {
        console.error("Failed to create chat:", error);
        return;
      }
    }

    const userMessage = { role: "user", content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setPrompt("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3002/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, chatId: currentChatId })
      });

      const data = await res.json();

      const assistantMessage = { role: "assistant", content: data.reply };
      setMessages(prev => [...prev, assistantMessage]);

      // Refresh sidebar after title is generated
      setTimeout(() => {
        if (refreshChats) refreshChats();
      }, 3000);

    } catch (error) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Error connecting to server"
      }]);
    }

    setLoading(false);
  };

  // ─── Enter to send, Shift+Enter for new line ──────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="chat-wrapper">

      {/* Top bar */}
      <div className="chat-topbar">
        <span className="chat-topbar-title">
          {activeChatId ? `Chat #${activeChatId}` : "AI Assistant"}
        </span>
        <button className="new-chat-btn" onClick={handleNewChat}>
          + New Chat
        </button>
      </div>

      {/* Messages area */}
      <div className="chat-messages">

        {messages.length === 0 && !loading && (
          <div className="chat-empty">
            <h2>How can I help you today?</h2>
            <p>Start a conversation with Mistral AI</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-bubble-row ${msg.role === "user" ? "user-row" : "assistant-row"}`}
          >
            {msg.role === "assistant" && (
              <div className="avatar assistant-avatar">M</div>
            )}

            <div className={`chat-bubble ${msg.role === "user" ? "user-bubble" : "assistant-bubble"}`}>
              {msg.content}
            </div>

            {msg.role === "user" && (
              <div className="avatar user-avatar">U</div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="chat-bubble-row assistant-row">
            <div className="avatar assistant-avatar">M</div>
            <div className="chat-bubble assistant-bubble typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-wrapper">
        <div className="chat-input-box">
          <textarea
            placeholder="Message Mistral... (Enter to send, Shift+Enter for new line)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={loading || !prompt.trim()}
          >
            ↑
          </button>
        </div>
        <p className="chat-disclaimer">Mistral runs locally via Ollama</p>
      </div>

    </div>
  );
}

export default Chat;