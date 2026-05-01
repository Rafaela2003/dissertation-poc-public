// Study Complete component - displays a completion message to participants 
// after they finish the post-interaction survey.
// It also provides an option to download the chat transcript for their records
// and contact information for the researcher in case they have questions about the study.

import React from "react";
export default function StudyComplete({ sessionId }) {
  const handleDownload = async () => {
    try {
      if (!sessionId) {
        console.error("No sessionId available");
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/experiment/transcript/${sessionId}`,
      );
      const data = await res.json();

      if (!data.transcript) {
        console.error("No transcript returned");
        return;
      }

      let text = " Chat Transcript \n\n";

      data.transcript.forEach((msg) => {
        text += `[User]: ${msg.user}\n`;
        text += `[Assistant]: ${msg.assistant}\n\n`;
      });

      const blob = new Blob([text], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "transcript.txt";
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  return (
    <div className="study-complete-container">
      <div className="study-complete-card">
        <div className="success-icon">✓</div>

        <h1>Study Complete</h1>

        <p className="completion-message">
          Thank you for participating in this research study!
        </p>

        <div className="completion-details">
          <p>
            Your responses have been recorded. All data will be kept
            confidential and used only for research purposes.
          </p>

          <p>If you have any questions about the study, please contact:</p>

          <div className="contact-info">
            <p>
              <strong>Researcher:</strong> Rafaela Mauricio Amado
            </p>
            <p>
              <strong>Email:</strong> u10ra22@abdn.ac.uk
            </p>
          </div>

          <div className="completion-actions">
            <button onClick={handleDownload} className="btn-primary">
              Download Transcript (Optional)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
