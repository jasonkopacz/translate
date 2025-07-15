import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// Determine which component to render based on the current context
const renderApp = () => {
  const root = document.getElementById("root");
  if (!root) return;

  // Check if we're in a popup context
  if (window.location.pathname.includes("popup")) {
    const Popup = React.lazy(() => import("./popup"));
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <React.Suspense fallback={<div>Loading...</div>}>
          <Popup />
        </React.Suspense>
      </React.StrictMode>
    );
    return;
  }

  // Default to main app
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Initialize background script
if (chrome.runtime && typeof chrome.runtime.getBackgroundPage === "function") {
  import("./background");
}

// Initialize content script
if (document.documentElement) {
  import("./content");
}

renderApp();
reportWebVitals();
