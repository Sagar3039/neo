import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

// Register the adblock Service Worker in browser mode only.
// Electron handles blocking via session.webRequest — SW is not needed there.
if (!window.electron && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/adblock-sw.js", { scope: "/" })
    .catch(() => {});
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
