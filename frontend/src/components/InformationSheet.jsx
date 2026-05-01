// Information Sheet component - displays the information sheet to participants 
// before they proceed to the consent form.

import React, { useState, useEffect } from "react";
import {
  getInformationSheet,
  logInfoSheetViewed,
} from "../services/experimentApi";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

export default function InformationSheet({ sessionId, onContinue }) {
  const [infoSheet, setInfoSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // load the information sheet when the component mounts
  useEffect(() => {
    loadInformationSheet();
  }, []);

  const loadInformationSheet = async () => {
    try {
      const data = await getInformationSheet();
      setInfoSheet(data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load information sheet:", err);
      setError("Failed to load information sheet");
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    try {
      await logInfoSheetViewed(sessionId);
      onContinue();
    } catch (err) {
      console.error("Failed to log info sheet view:", err);
      // Continue anyway
      onContinue();
    }
  };

  if (loading) {
    return (
      <div className="info-sheet-container">
        <div className="loading">Loading information sheet...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="info-sheet-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="info-sheet-container">
      <div className="info-sheet-card">
        <img src="/logo.png" alt="University Logo" className="logo" />

        <h1>{infoSheet.title}</h1>

        <div className="info-sheet-content">
          <ReactMarkdown remarkPlugins={[remarkBreaks]}>
            {infoSheet.content?.replace(/\\n/g, "\n")}
          </ReactMarkdown>
        </div>

        <div className="info-sheet-footer">
          <button onClick={handleContinue} className="btn-primary btn-large">
            Continue to Consent Form
          </button>
        </div>
      </div>
    </div>
  );
}
