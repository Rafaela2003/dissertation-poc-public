// Post Survey component - displays the post-interaction survey to participants after they finish the chat interaction.
// It fetches the survey questions from the backend, renders them, and handles the submission of responses.
// It also ensures that all required questions are answered before allowing submission.

import React, { useState, useEffect } from "react";
import {
  getSurveyQuestions,
  submitSurvey,
  endChat,
} from "../services/experimentApi";

export default function PostSurvey({ sessionId, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Safe parser to fix error when options is a string instead of an object
  // Change parseOptions to accept questionType:
  const parseOptions = (options, questionType) => {
    if (!options) return null;

    // Already a structured object (has known keys)
    if (typeof options === "object" && !Array.isArray(options)) return options;

    // Parse if it's a JSON string
    let arr = options;
    if (typeof options === "string") {
      try { arr = JSON.parse(options); } catch { return null; }
    }

    // Normalise plain array based on question type
    if (Array.isArray(arr)) {
      if (questionType === "likert") return { scale: arr };
      if (questionType === "multiple_choice") return { choices: arr, multiple: true, hasOther: arr.includes("Other") };
      if (questionType === "single_choice") return { choices: arr, multiple: false };
    }

    return arr;
  };

  useEffect(() => {
    loadSurveyQuestions();
  }, []);

  const loadSurveyQuestions = async () => {
    try {
      const data = await getSurveyQuestions();
      setQuestions(data);

      const initialResponses = {};
      data.forEach((q) => {
        const options = parseOptions(q.options, q.questionType);
        initialResponses[q.id] = q.questionType === "multiple_choice" ? [] : "";
      });

      setResponses(initialResponses);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load survey questions:", err);
      setError("Failed to load survey");
      setLoading(false);
    }
  };

  const handleResponseChange = (question, value) => {
    setResponses((prev) => {
      if (question.questionType === "multiple_choice") {
        const current = Array.isArray(prev[question.id]) ? prev[question.id] : [];

        return {
          ...prev,
          [question.id]: current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value],
        };
      }

      return {
        ...prev,
        [question.id]: value,
      };
    });
  };

  const allRequiredAnswered = () => {
    return questions
      .filter((q) => q.required)
      .every((q) => {
        const answer = responses[q.id];

        if (Array.isArray(answer)) {
          return answer.length > 0;
        }

        return answer && answer.toString().trim().length > 0;
      });
  };

  const handleSubmit = async () => {
    if (!allRequiredAnswered()) {
      alert("Please answer all required questions.");
      return;
    }

    setSubmitting(true);

    try {
      await endChat(sessionId);

      const formattedResponses = questions.map((q) => ({
        questionId: q.id.toString(),
        questionText: q.questionText,
        questionType: q.questionType,
        response: Array.isArray(responses[q.id])
          ? JSON.stringify(responses[q.id])
          : responses[q.id] || "",
      }));

      await submitSurvey(sessionId, formattedResponses);
      onComplete();
    } catch (err) {
      console.error("Failed to submit survey:", err);
      setError("Failed to submit survey. Please try again.");
      setSubmitting(false);
    }
  };

  const renderQuestion = (question) => {
    const options = parseOptions(question.options, question.questionType);

    switch (question.questionType) {
      case "likert":
        return (
          <div className="survey-question" key={question.id}>
            <label className="question-text">
              {question.questionText}
              {question.required && <span className="required">*</span>}
            </label>

            <div className="likert-scale">
              {options?.scale?.map((label, index) => (
                <label key={index} className="likert-option">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={label}
                    checked={responses[question.id] === label}
                    onChange={() => handleResponseChange(question, label)}
                    disabled={submitting}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        );

        case "single_choice":
          return (
            <div className="survey-question" key={question.id}>
              <label className="question-text">
                {question.questionText}
                {question.required && <span className="required">*</span>}
              </label>
              <div className="multiple-choice">
                {options?.choices?.map((choice, index) => (
                  <label key={index} className="choice-option">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={choice}
                      checked={responses[question.id] === choice}
                      onChange={() => handleResponseChange(question, choice)}
                      disabled={submitting}
                    />
                    <span>{choice}</span>
                  </label>
                ))}
              </div>
            </div>
          );

            case "multiple_choice":
              return (
                <div className="survey-question" key={question.id}>
                  <label className="question-text">
                    {question.questionText}
                    {question.required && <span className="required">*</span>}
                  </label>
                  <div className="multiple-choice">
                    {options?.choices?.map((choice, index) => (
                      <label key={index} className="choice-option">
                        <input
                          type="checkbox"
                          name={`question-${question.id}-${index}`}
                          value={choice}
                          checked={(responses[question.id] || []).includes(choice)}
                          onChange={() => handleResponseChange(question, choice)}
                          disabled={submitting}
                        />
                        <span>{choice}</span>
                      </label>
                    ))}
                    {options?.hasOther &&
                      (responses[question.id] || []).some((v) => v.startsWith("Other")) && (
                        <input
                          type="text"
                          placeholder="Please specify..."
                          className="other-input"
                          onChange={(e) => {
                            const filtered = (responses[question.id] || []).filter(
                              (v) => !v.startsWith("Other")
                            );
                            setResponses((prev) => ({
                              ...prev,
                              [question.id]: [...filtered, `Other: ${e.target.value}`],
                            }));
                          }}
                        />
                      )}
                  </div>
                </div>
              );
      case "text":
        return (
          <div className="survey-question" key={question.id}>
            <label className="question-text">
              {question.questionText}
              {question.required && <span className="required">*</span>}
            </label>

            <textarea
              className="text-response"
              rows={4}
              value={responses[question.id] || ""}
              onChange={(e) => handleResponseChange(question, e.target.value)}
              disabled={submitting}
              placeholder="Type your response here..."
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <div className="loading">Loading survey...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="survey-container">
      <div className="survey-card">
        <h1>Post-Interaction Survey</h1>

        <form
          className="survey-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {questions.map((q) => renderQuestion(q))}

          <div className="survey-footer">
            <button
              className="btn-secondary"
              disabled={!allRequiredAnswered() || submitting}
            >
              {submitting ? "Submitting..." : "Submit Survey"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
