// Consent form component for displaying consent statements 
// and handling user consent/decline actions

import React, { useState, useEffect } from "react";
import { getConsentStatements, submitConsent } from "../services/experimentApi";

export default function ConsentForm({ sessionId, onConsent, onDecline }) {
  const [statements, setStatements] = useState([]);
  const [checkedStates, setCheckedStates] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadConsentStatements();
  }, []);

  const loadConsentStatements = async () => {
    try {
      const data = await getConsentStatements();
      setStatements(data);

      // Initialise checked states
      const initialStates = {};
      data.forEach((statement) => {
        initialStates[statement.id] = false;
      });
      setCheckedStates(initialStates);

      setLoading(false);
    } catch (err) {
      console.error("Failed to load consent statements:", err);
      setError("Failed to load consent form");
      setLoading(false);
    }
  };

  const handleCheckboxChange = (statementId) => {
    setCheckedStates((prev) => ({
      ...prev,
      [statementId]: !prev[statementId],
    }));
  };

  const allRequiredChecked = () => {
    return statements
      .filter((s) => s.required)
      .every((s) => checkedStates[s.id]);
  };

  const handleConsent = async () => {
    if (!allRequiredChecked()) {
      alert("Please check all required consent statements to continue.");
      return;
    }

    setSubmitting(true);
    try {
      await submitConsent(sessionId, true);
      onConsent();
    } catch (err) {
      console.error("Failed to submit consent:", err);
      setError("Failed to submit consent. Please try again.");
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to decline participation? This will end the study.",
    );

    if (confirmed) {
      setSubmitting(true);
      try {
        await submitConsent(sessionId, false);
        onDecline();
      } catch (err) {
        console.error("Failed to submit decline:", err);
        onDecline(); // Proceed anyway
      }
    }
  };

  if (loading) {
    return (
      <div className="consent-container">
        <div className="loading">Loading consent form...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="consent-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="consent-container">
      <div className="consent-card">
        <h1>Consent Form</h1>

        <p className="consent-intro">
          Please read each statement carefully and check the boxes to indicate
          your consent.
        </p>

        <div className="consent-statements">
          {statements.map((statement) => (
            <div key={statement.id} className="consent-statement">
              <label className="consent-checkbox">
                <input
                  type="checkbox"
                  checked={checkedStates[statement.id] || false}
                  onChange={() => handleCheckboxChange(statement.id)}
                  disabled={submitting}
                />
                <span className="consent-text">
                  {statement.text}
                  {statement.required && <span className="required">*</span>}
                </span>
              </label>
            </div>
          ))}
        </div>

        <div className="consent-footer">
          <button
            onClick={handleDecline}
            className="btn-secondary"
            disabled={submitting}
          >
            I Do Not Consent
          </button>

          <button
            onClick={handleConsent}
            className="btn-primary"
            disabled={!allRequiredChecked() || submitting}
          >
            {submitting ? "Submitting..." : "I Consent"}
          </button>
        </div>

        <p className="consent-note">* Required fields</p>
      </div>
    </div>
  );
}
