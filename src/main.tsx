import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const rootEl = document.getElementById("root");

if (!rootEl) {
  document.body.innerHTML = '<div style="padding:2rem;color:#fff;background:#1a1a2e"><h1>KioQ: 起動エラー</h1><p>root要素が見つかりません</p></div>';
} else {
  try {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    rootEl.innerHTML = `<div style="padding:2rem;color:#fff;background:#1a1a2e"><h1>KioQ: 起動エラー</h1><pre style="color:#f87171;white-space:pre-wrap">${err instanceof Error ? err.message : String(err)}</pre></div>`;
  }
}
