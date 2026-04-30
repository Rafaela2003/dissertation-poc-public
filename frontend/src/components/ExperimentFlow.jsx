// Main component to manage the flow of the experiment, including session initialisation,
// step transitions and state persistence

import React, { useState, useEffect } from "react";
import InformationSheet from "./InformationSheet";
import ConsentForm from "./ConsentForm";
import ChatInterface from "./ChatInterface";
import PostSurvey from "./PostSurvey";
import StudyComplete from "./StudyComplete";
import Instructions from "./Instructions";
import { createSession, getSession } from "../services/experimentApi";

export default function ExperimentFlow() {
  const [currentStep, setCurrentStep] = useState("loading");
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    initialiseSession();
  }, []);

  const initialiseSession = async () => {
    try {
      console.log("Initialising experiment session...");

      // Check localStorage
      const existingSessionId = localStorage.getItem("experiment_session_id");
      const existingStep = localStorage.getItem("experiment_step");

      console.log("Existing session:", existingSessionId);
      console.log("Existing step:", existingStep);

      // If we have a completed/ended session, clear and start fresh
      if (
        existingStep === "complete" ||
        existingStep === "declined" ||
        existingStep === "withdrawn"
      ) {
        console.log("Previous session was completed/ended - starting fresh");
        localStorage.clear();

        const response = await createSession();
        setSessionId(response.sessionId);
        localStorage.setItem("experiment_session_id", response.sessionId);
        setCurrentStep("info_sheet");
        localStorage.setItem("experiment_step", "info_sheet");
        return;
      }

      // If we have a session in progress, resume it
      if (existingSessionId && existingStep && existingStep !== "loading") {
        console.log(
          "Resuming session:",
          existingSessionId,
          "at step:",
          existingStep,
        );
        setSessionId(existingSessionId);
        setCurrentStep(existingStep);
        return;
      }

      // Otherwise, create new session
      console.log("Creating new session...");
      const response = await createSession();
      console.log("Session created:", response.sessionId);

      setSessionId(response.sessionId);
      localStorage.setItem("experiment_session_id", response.sessionId);
      setCurrentStep("info_sheet");
      localStorage.setItem("experiment_step", "info_sheet");
    } catch (error) {
      console.error("Failed to initialise session:", error);
      setCurrentStep("error");
    }
  };

  const handleStepChange = (newStep) => {
    console.log("Step change:", currentStep, "→", newStep);
    setCurrentStep(newStep);
    localStorage.setItem("experiment_step", newStep);
  };

  const handleConsentDeclined = () => {
    handleStepChange("declined");
    setTimeout(() => {
      localStorage.clear();
      window.close();
    }, 5000);
  };

  const handleWithdraw = () => {
    handleStepChange("withdrawn");
    setTimeout(() => {
      localStorage.clear();
      window.close();
    }, 5000);
  };

  const handleStudyComplete = () => {
    handleStepChange("complete");
    setTimeout(() => {
      localStorage.clear();
    }, 10000);
  };

  // Debug output
  console.log("Current step:", currentStep);
  console.log("Session ID:", sessionId);

  if (currentStep === "chat") {
    return (
      <ChatInterface
        sessionId={sessionId}
        onTimerExpire={() => handleStepChange("survey")}
        onWithdraw={handleWithdraw}
      />
    );
  }

  return (
    <div className="experiment-container">
      {currentStep === "loading" && (
        <div className="loading-screen">
          <h2>Loading...</h2>
        </div>
      )}

      {currentStep === "error" && (
        <div className="error-screen">
          <h2>Error</h2>
          <p>
            The experiment can take multiple attempts to load. Please try again.
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
          >
            Refresh
          </button>
        </div>
      )}

      {currentStep === "info_sheet" && (
        <InformationSheet
          sessionId={sessionId}
          onContinue={() => handleStepChange("consent")}
        />
      )}

      {currentStep === "consent" && (
        <ConsentForm
          sessionId={sessionId}
          onConsent={() => handleStepChange("instructions")}
          onDecline={handleConsentDeclined}
        />
      )}

      {currentStep === "instructions" && (
        <Instructions
          sessionId={sessionId}
          onContinue={() => handleStepChange("chat")}
        />
      )}

      {currentStep === "chat" && (
        <ChatInterface
          sessionId={sessionId}
          onTimerExpire={() => handleStepChange("survey")}
          onWithdraw={handleWithdraw}
        />
      )}

      {currentStep === "survey" && (
        <PostSurvey sessionId={sessionId} onComplete={handleStudyComplete} />
      )}

      {currentStep === "complete" && <StudyComplete sessionId={sessionId} />}

      {currentStep === "declined" && (
        <div className="study-end-screen">
          <h2>Study Declined</h2>
          <p>
            Thank you for your time. You have chosen not to participate in this
            study.
          </p>
          <p>This window will close automatically.</p>
        </div>
      )}

      {currentStep === "withdrawn" && (
        <div className="study-end-screen">
          <h2>Withdrawn from Study</h2>
          <p>You have withdrawn from the study. Thank you for your time.</p>
          <p>This window will close automatically.</p>
        </div>
      )}
    </div>
  );
}
