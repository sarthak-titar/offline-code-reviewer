import React, { useState, useEffect } from "react";
import "./Sidebar.css";

function Sidebar({
  activePage, setActivePage,
  activeChatId, setActiveChatId,
  activeReviewId, setActiveReviewId,
  activeGenerationId, setActiveGenerationId,
  refreshKey
}) {

  const [chatOpen, setChatOpen] = useState(true);
  const [reviewerOpen, setReviewerOpen] = useState(true);
  const [generatorOpen, setGeneratorOpen] = useState(true);
  const [chats, setChats] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [generations, setGenerations] = useState([]);

  // ─── Fetch all data ───────────────────────────────────────────────────────
  const fetchChats = async () => {
    try {
      const res = await fetch("http://localhost:3002/api/chats");
      const data = await res.json();
      setChats(data);
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/reviews");
      const data = await res.json();
      setReviews(data);
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    }
  };

  const fetchGenerations = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/generations");
      const data = await res.json();
      setGenerations(data);
    } catch (err) {
      console.error("Failed to fetch generations:", err);
    }
  };

  // ─── Fetch on mount and refreshKey change ─────────────────────────────────
  useEffect(() => {
    fetchChats();
    fetchReviews();
    fetchGenerations();
  }, [refreshKey]);

  // ─── Select handlers ──────────────────────────────────────────────────────
  const handleChatSelect = (chatId) => {
    setActiveChatId(chatId);
    setActivePage("chat");
  };

  const handleReviewSelect = (reviewId) => {
    setActiveReviewId(reviewId);
    setActivePage("reviewer");
  };

  const handleGenerationSelect = (generationId) => {
    setActiveGenerationId(generationId);
    setActivePage("generator");
  };

  // ─── Delete handlers ──────────────────────────────────────────────────────
  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:3002/api/chats/${chatId}`, {
        method: "DELETE"
      });
      if (activeChatId === chatId) setActiveChatId(null);
      fetchChats();
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  const handleDeleteReview = async (e, reviewId) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:3000/api/reviews/${reviewId}`, {
        method: "DELETE"
      });
      if (activeReviewId === reviewId) setActiveReviewId(null);
      fetchReviews();
    } catch (err) {
      console.error("Failed to delete review:", err);
    }
  };

  const handleDeleteGeneration = async (e, generationId) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:3001/api/generations/${generationId}`, {
        method: "DELETE"
      });
      if (activeGenerationId === generationId) setActiveGenerationId(null);
      fetchGenerations();
    } catch (err) {
      console.error("Failed to delete generation:", err);
    }
  };

  // ─── Reusable history list ────────────────────────────────────────────────
  const HistoryList = ({ items, activeId, onSelect, onDelete, emptyText, badge }) => (
    <div className="sidebar-history">
      {items.length === 0 ? (
        <p className="sidebar-empty">{emptyText}</p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className={`sidebar-history-item ${activeId === item.id ? "active-item" : ""}`}
            onClick={() => onSelect(item.id)}
          >
            <span className="sidebar-history-dot">›</span>
            <span className="sidebar-history-title">
              {item.title || "Untitled"}
            </span>
            {badge && badge(item)}
            <button
              className="sidebar-delete-btn"
              onClick={(e) => onDelete(e, item.id)}
              title="Delete"
            >
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  );

  // ─── Reusable section button ──────────────────────────────────────────────
  const SectionBtn = ({ page, icon, label, isOpen, onToggle, count }) => (
    <button
      className={`sidebar-section-btn ${activePage === page ? "active" : ""}`}
      onClick={onToggle}
    >
      <span className="sidebar-section-left">
        <span className="sidebar-section-icon">{icon}</span>
        {label}
      </span>
      <div className="sidebar-section-right">
        {count > 0 && (
          <span className="sidebar-count-chip">{count}</span>
        )}
        <span className={`sidebar-arrow ${isOpen ? "open" : ""}`}>▾</span>
      </div>
    </button>
  );

  return (
    <div className="sidebar">

      {/* ── Logo ── */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">⌬</span>
          <span className="sidebar-logo-text">AI Assistant</span>
        </div>
        <div className="sidebar-logo-sub">Offline · Mistral</div>
      </div>

      {/* ── Menu ── */}
      <div className="sidebar-menu">

        {/* ── Chat Section ── */}
        <div className="sidebar-section">
          <SectionBtn
            page="chat"
            icon="💬"
            label="Chat"
            isOpen={chatOpen}
            count={chats.length}
            onToggle={() => {
              setActivePage("chat");
              setChatOpen(!chatOpen);
            }}
          />
          {chatOpen && (
            <HistoryList
              items={chats}
              activeId={activeChatId}
              onSelect={handleChatSelect}
              onDelete={handleDeleteChat}
              emptyText="No chats yet"
            />
          )}
        </div>

        <div className="sidebar-divider" />

        {/* ── Generator Section ── */}
        <div className="sidebar-section">
          <SectionBtn
            page="generator"
            icon="⚡"
            label="Code Generator"
            isOpen={generatorOpen}
            count={generations.length}
            onToggle={() => {
              setActivePage("generator");
              setGeneratorOpen(!generatorOpen);
            }}
          />
          {generatorOpen && (
            <HistoryList
              items={generations}
              activeId={activeGenerationId}
              onSelect={handleGenerationSelect}
              onDelete={handleDeleteGeneration}
              emptyText="No generations yet"
              badge={(item) =>
                item.language && item.language !== "Unknown" ? (
                  <span className="sidebar-lang-chip">
                    {item.language.slice(0, 4)}
                  </span>
                ) : null
              }
            />
          )}
        </div>

        <div className="sidebar-divider" />

        {/* ── Reviewer Section ── */}
        <div className="sidebar-section">
          <SectionBtn
            page="reviewer"
            icon="🔍"
            label="Code Reviewer"
            isOpen={reviewerOpen}
            count={reviews.length}
            onToggle={() => {
              setActivePage("reviewer");
              setReviewerOpen(!reviewerOpen);
            }}
          />
          {reviewerOpen && (
            <HistoryList
              items={reviews}
              activeId={activeReviewId}
              onSelect={handleReviewSelect}
              onDelete={handleDeleteReview}
              emptyText="No reviews yet"
              badge={(item) =>
                item.rating > 0 ? (
                  <span className="sidebar-rating-chip">
                    {item.rating}
                  </span>
                ) : null
              }
            />
          )}
        </div>

      </div>

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <span className="sidebar-footer-dot"></span>
        <span>Offline Mode</span>
        <span className="sidebar-footer-ver">v1.0</span>
      </div>

    </div>
  );
}

export default Sidebar;