// Persona Testing Panel - a component to test the persona assignment logic 
// by creating multiple sessions and checking the assigned personas.
// This is useful for validating that the persona assignment is working correctly 
// and that different sessions receive different personas as expected.

import React, { useState } from "react";
import { createSession } from "../services/experimentApi";
import { assignPersona } from "../services/apiClient";

export default function PersonaTestingPanel() {
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const runTest = async (numTests = 5) => {
    setTesting(true);
    setTestResults([]);
    const results = [];

    for (let i = 0; i < numTests; i++) {
      try {
        // Create new session
        const sessionResponse = await createSession();
        const sessionId = sessionResponse.sessionId;

        // Assign persona
        const personaResponse = await assignPersona(sessionId);

        results.push({
          testNumber: i + 1,
          sessionId,
          personaId: personaResponse.personaId,
          personaName: personaResponse.name,
          timestamp: new Date().toISOString(),
        });

        setTestResults([...results]);
      } catch (error) {
        results.push({
          testNumber: i + 1,
          error: error.message,
        });
        setTestResults([...results]);
      }
    }

    setTesting(false);
  };

  const personaDistribution = testResults.reduce((acc, result) => {
    if (result.personaId) {
      acc[result.personaId] = acc[result.personaId] || {
        name: result.personaName,
        count: 0,
        sessions: [],
      };
      acc[result.personaId].count++;
      acc[result.personaId].sessions.push(result.sessionId.slice(0, 8));
    }
    return acc;
  }, {});

  return (
    <div className="testing-panel">
      <div className="testing-header">
        <h2>Persona Assignment Validation</h2>
        <p>Test that different sessions receive different personas</p>
      </div>

      <div className="testing-controls">
        <button
          onClick={() => runTest(5)}
          disabled={testing}
          className="btn-test"
        >
          {testing ? "Testing..." : "Run 5 Tests"}
        </button>
        <button
          onClick={() => runTest(10)}
          disabled={testing}
          className="btn-test"
        >
          {testing ? "Testing..." : "Run 10 Tests"}
        </button>
        <button
          onClick={() => setTestResults([])}
          disabled={testing}
          className="btn-clear"
        >
          Clear Results
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="testing-results">
          <h3>Test Results ({testResults.length} tests)</h3>

          <div className="results-table">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Session ID</th>
                  <th>Persona ID</th>
                  <th>Persona Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result, idx) => (
                  <tr
                    key={idx}
                    className={result.error ? "error-row" : "success-row"}
                  >
                    <td>{result.testNumber}</td>
                    <td className="mono">
                      {result.sessionId?.slice(0, 12) || "N/A"}...
                    </td>
                    <td>{result.personaId || "N/A"}</td>
                    <td>{result.personaName || "N/A"}</td>
                    <td>{result.error ? `X ${result.error}` : "Success"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="distribution-summary">
            <h3>Persona Distribution</h3>
            {Object.entries(personaDistribution).map(([personaId, data]) => (
              <div key={personaId} className="distribution-item">
                <div className="distribution-header">
                  <strong>
                    Persona {personaId}: {data.name}
                  </strong>
                  <span className="distribution-count">
                    {data.count} session(s)
                  </span>
                </div>
                <div className="distribution-sessions">
                  {data.sessions.join(", ")}
                </div>
              </div>
            ))}
          </div>

          <div className="test-summary">
            <h3>Summary</h3>
            <div className="summary-stats">
              <div className="stat">
                <strong>Total Tests:</strong> {testResults.length}
              </div>
              <div className="stat">
                <strong>Successful:</strong>{" "}
                {testResults.filter((r) => !r.error).length}
              </div>
              <div className="stat">
                <strong>Failed:</strong>{" "}
                {testResults.filter((r) => r.error).length}
              </div>
              <div className="stat">
                <strong>Unique Personas:</strong>{" "}
                {Object.keys(personaDistribution).length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
