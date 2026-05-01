// The entry point of the React application. It imports the main App component 
// and renders it to the DOM.
// It also imports the global CSS styles for the application.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; 
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
