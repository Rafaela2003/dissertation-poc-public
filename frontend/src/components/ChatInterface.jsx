import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { sendMessage, assignPersona } from "../services/apiClient";
import {
  startChat,
  endChat,
  withdrawFromStudy,
} from "../services/experimentApi";

const TIMER_DURATION = 8 * 60; // 8 minute in seconds

export default function ChatInterface({
  sessionId,
  onTimerExpire,
  onWithdraw,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState(null);
  const [personaId, setPersonaId] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Timer state - use ref for start time to avoid re-renders
  const [timeRemaining, setTimeRemaining] = useState(TIMER_DURATION);
  const [chatEnded, setChatEnded] = useState(false);
  const startTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    initializeChat();
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initializeChat = async () => {
    console.log("Initializing chat for session:", sessionId);

    try {
      const savedStartTime = localStorage.getItem(`chat_start_${sessionId}`);

      if (savedStartTime) {
        console.log("Checking saved session...");

        // Calculate elapsed time
        const startTimeDate = new Date(savedStartTime);
        const elapsed = Math.floor(
          (Date.now() - startTimeDate.getTime()) / 1000,
        );
        const remaining = Math.max(0, TIMER_DURATION - elapsed);

        // Check if session is expired or corrupted
        if (elapsed > TIMER_DURATION + 60 || elapsed < 0) {
          // More than 10 min + 1 min grace or negative time (corrupted)
          console.log(`Session invalid (elapsed: ${elapsed}s), starting fresh`);

          // Clear expired/corrupted data
          localStorage.removeItem(`chat_start_${sessionId}`);
          localStorage.removeItem(`persona_${sessionId}`);

          // Start new session
          await startNewSession();
          return;
        }

        console.log(`Resuming session (${remaining}s remaining)`);

        const savedPersonaData = localStorage.getItem(`persona_${sessionId}`);
        if (savedPersonaData) {
          const personaData = JSON.parse(savedPersonaData);
          setPersona(personaData.persona);
          setPersonaId(personaData.personaId);
        }

        // Set the start time
        startTimeRef.current = startTimeDate;
        setTimeRemaining(remaining);
        setInitializing(false);

        if (remaining > 0) {
          startTimer();
        } else {
          handleTimerExpire();
        }
      } else {
        console.log("No saved session, starting new");
        await startNewSession();
      }
    } catch (error) {
      console.error("Chat initialization error:", error);
      setInitializing(false);
      alert(
        "Failed to start the experiment. Please contact the researcher.\n\nError: " +
          error.message,
      );
    }
  };

  const startNewSession = async () => {
    // Clear old session data from other sessions
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        (key.startsWith("chat_start_") || key.startsWith("persona_")) &&
        !key.includes(sessionId)
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      console.log(`Cleaning up old key: ${key}`);
      localStorage.removeItem(key);
    });

    console.log("Assigning persona...");
    const personaResponse = await assignPersona(sessionId);
    console.log("Persona assigned:", personaResponse);

    setPersona(personaResponse.persona);
    setPersonaId(personaResponse.personaId);

    localStorage.setItem(
      `persona_${sessionId}`,
      JSON.stringify({
        persona: personaResponse.persona,
        personaId: personaResponse.personaId,
      }),
    );

    console.log("Starting chat session...");
    const chatResponse = await startChat(sessionId, personaResponse.personaId);
    console.log("Chat started:", chatResponse);

    const startTime = chatResponse.startTime || new Date().toISOString();
    localStorage.setItem(`chat_start_${sessionId}`, startTime);
    startTimeRef.current = new Date(startTime);

    console.log(`Timer initialized at: ${startTime}`);

    setTimeRemaining(TIMER_DURATION);
    setInitializing(false);
    startTimer();
  };

  const startTimer = () => {
    console.log("Starting timer...");

    // Clear any existing interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Update timer every second by calculating elapsed time
    timerIntervalRef.current = setInterval(() => {
      if (!startTimeRef.current) return;

      const elapsed = Math.floor(
        (Date.now() - startTimeRef.current.getTime()) / 1000,
      );
      const remaining = Math.max(0, TIMER_DURATION - elapsed);

      setTimeRemaining(remaining);

      if (remaining <= 0) {
        handleTimerExpire();
      }
    }, 1000);
  };

  const handleTimerExpire = async () => {
    console.log("Timer expired");

    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setChatEnded(true);

    try {
      console.log("Ending chat for session:", sessionId);
      await endChat(sessionId);
      console.log("Chat successfully marked as completed");

      // Clear localStorage for this session
      localStorage.removeItem(`chat_start_${sessionId}`);
      localStorage.removeItem(`persona_${sessionId}`);

      onTimerExpire();
    } catch (error) {
      console.error("Failed to log chat end:", error);
      onTimerExpire();
    }
  };

  const handleWithdraw = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to withdraw from the study? This action cannot be undone.",
    );

    if (confirmed) {
      try {
        await withdrawFromStudy(sessionId);

        // Clear localStorage
        localStorage.removeItem(`chat_start_${sessionId}`);
        localStorage.removeItem(`persona_${sessionId}`);

        onWithdraw();
      } catch (error) {
        console.error("Failed to log withdrawal:", error);
        onWithdraw();
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || chatEnded || !personaId) {
      return;
    }

    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await sendMessage(input, sessionId, personaId);

      const botMessage = {
        role: "assistant",
        content: response.response,
        timestamp: response.timestamp,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Message send error:", error);

      if (error.response?.status === 403 && error.response?.data?.blocked) {
        const blockData = error.response.data;
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: `${blockData.message}`,
            timestamp: new Date().toISOString(),
            blocked: true,
            isWarning: true,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: "Error: Could not get response. Please try again.",
          timestamp: new Date().toISOString(),
          isWarning: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (initializing) {
    return (
      <div className="chat-layout">
        <div className="chat-loading">
          <h2>Preparing your chat session...</h2>
          <p>Assigning persona and starting timer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Persona Sidebar */}
      <aside className={`persona-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <button
          className="sidebar-toggle-btn"
          onClick={() => setSidebarOpen(false)}
          style={{ margin: "12px 16px 0", alignSelf: "flex-start" }}
        >
          X Close
        </button>
        <div className="sidebar-header">
          <h3>Your Assigned Role</h3>
          {personaId && (
            <span className="persona-badge">Persona #{personaId}</span>
          )}
        </div>

        {persona ? (
          <div className="persona-details-sidebar">
            <div className="persona-section">
              <strong>Name</strong>
              <p>{persona.PER.full_name}</p>
            </div>

            <div className="persona-section">
              <strong>Username</strong>
              <p>@{persona.PER.username}</p>
            </div>

            <div className="persona-section">
              <strong>Age</strong>
              <p>{persona.DEM.age} years old</p>
            </div>

            <div className="persona-section">
              <strong>Job</strong>
              <p>{persona.DEM.job_title}</p>
            </div>

            <div className="persona-section">
              <strong>Organisation</strong>
              <p>{persona.ORG.organisation}</p>
            </div>

            <div className="persona-section">
              <strong>Location</strong>
              <p>
                {persona.LOC.city}, {persona.LOC.country}
              </p>
            </div>

            <div className="persona-section">
              <strong>Education</strong>
              <p>{persona.DEM.education_level}</p>
            </div>

            <div className="persona-section">
              <strong>Income</strong>
              <p>{persona.QUANTITY.income_range}</p>
            </div>

            <div className="persona-section">
              <strong>Email</strong>
              <p className="persona-small-text">{persona.CODE.email}</p>
            </div>

            <div className="persona-section">
              <strong>Phone</strong>
              <p>{persona.CODE.phone}</p>
            </div>

            <div className="persona-section">
              <strong>Background</strong>
              <p className="persona-small-text">{persona.PROFILE.background}</p>
            </div>

            <div className="persona-section">
              <strong>Goals</strong>
              <p className="persona-small-text">{persona.PROFILE.goals}</p>
            </div>
          </div>
        ) : (
          <div className="persona-loading">
            <p>Loading persona...</p>
          </div>
        )}

        <div className="sidebar-footer">
          <span className="session-id-small">
            Session: {sessionId.slice(0, 8)}...
          </span>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-main">
        <div className="chat-container">
          {/* Header with Timer and Withdraw */}
          <div className="chat-header-with-controls">
            <h2>Research Study Chat</h2>
            <button
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen(true)}
            >
              Your Assigned Role
            </button>

            <div className="chat-controls">
              <div
                className={`timer-display-inline ${timeRemaining < 60 ? "timer-warning" : ""}`}
              >
                <span className="timer-text">{formatTime(timeRemaining)}</span>
              </div>

              <button
                onClick={handleWithdraw}
                className="btn-withdraw-inline"
                disabled={chatEnded}
              >
                Withdraw from Study
              </button>
            </div>
          </div>

          {chatEnded && (
            <div className="chat-ended-notice">
              <h3>Chat Session Ended</h3>
              <p>Redirecting to survey...</p>
            </div>
          )}

          <div className="privacy-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <strong>Important:</strong> Use ONLY the fictional information
              from your assigned persona. Do NOT share your real personal
              information.
            </div>
          </div>

          <div className="messages-container">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`message message-${msg.role} ${msg.isWarning ? "message-warning" : ""}`}
              >
                <div className="message-content">
                  {msg.role === "assistant" ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
                <div className="message-timestamp">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {loading && (
              <div className="message message-assistant">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-container">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                chatEnded
                  ? "Chat ended"
                  : "Type your message as your assigned persona..."
              }
              disabled={loading || !personaId || chatEnded}
              rows={3}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim() || !personaId || chatEnded}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
