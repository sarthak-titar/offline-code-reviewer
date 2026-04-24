import { useState, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import Chat from "./pages/Chat";
import Generator from "./pages/Generator";
import Reviewer from "./pages/Reviewer";
import "./App.css";

function App() {

  const [activePage, setActivePage] = useState("chat");
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeReviewId, setActiveReviewId] = useState(null);
  const [activeGenerationId, setActiveGenerationId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshChats = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const refreshReviews = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const refreshGenerations = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      overflow: "hidden",
      background: "#080f1a"
    }}>

      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        activeReviewId={activeReviewId}
        setActiveReviewId={setActiveReviewId}
        activeGenerationId={activeGenerationId}
        setActiveGenerationId={setActiveGenerationId}
        refreshKey={refreshKey}
      />

      <div style={{ flex: 1, overflow: "hidden" }}>
        {activePage === "chat" && (
          <Chat
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
            refreshChats={refreshChats}
          />
        )}
        {activePage === "generator" && (
          <Generator
            activeGenerationId={activeGenerationId}
            setActiveGenerationId={setActiveGenerationId}
            refreshGenerations={refreshGenerations}
          />
        )}
        {activePage === "reviewer" && (
          <Reviewer
            activeReviewId={activeReviewId}
            setActiveReviewId={setActiveReviewId}
            refreshReviews={refreshReviews}
          />
        )}
      </div>

    </div>
  );
}

export default App;