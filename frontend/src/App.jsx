// App component serves as the main entry point for the React application.
// It imports and renders the ExperimentFlow component, which manages the flow of the user through the experiment.

import React from "react";
import ExperimentFlow from "./components/ExperimentFlow";
import "./App.css";

function App() {
  return (
    <div className="App">
      <ExperimentFlow />
    </div>
  );
}

export default App;
