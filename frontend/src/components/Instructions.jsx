// Instructions component - displays the instructions to participants before 
// they proceed to the chat interface.

import React from "react";

function Instructions({ onContinue }) {
  return (
    <div className="instructions-container">
      <div className="instructions-card">
        <h1>Instructions</h1>

        <div className="instructions-intro">
          Please read the following instructions carefully before proceeding.
        </div>

        <div className="instructions-content">
          <div className="instruction-item">
            <div className="instruction-text">
              You are encouraged to ask questions and engage in back-and-forth
              conversation
            </div>
          </div>

          <div className="instruction-item">
            <div className="instruction-text">
              Respond to the chatbot's messages as your assigned persona would
            </div>
          </div>

          <div className="instruction-item">
            <div className="instruction-text">
              You may ask follow-up questions, seek clarification or explore
              topics naturally
            </div>
          </div>

          <div className="instruction-item">
            <div className="instruction-text">
              DO NOT share real, personal, identifiable or sensitive information
            </div>
          </div>

          <div className="instruction-item">
            <div className="instruction-text">
              You may withdraw at any time.
            </div>
          </div>
        </div>

        <div className="instructions-footer">
          <button onClick={onContinue} className="btn-primary">
            Continue to Chat
          </button>
        </div>
      </div>
    </div>
  );
}

export default Instructions;
