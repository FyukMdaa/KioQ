// ============================================================
// KioQ アプリケーションルート
// ============================================================
import { Component, type ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { HomePage } from "@/pages/Home";
import { DeckDetailPage } from "@/pages/DeckDetail";
import { StudyPage } from "@/pages/Study";
import { SettingsPage } from "@/pages/Settings";
import { ImportPage } from "@/pages/Import";
import { TooltipProvider } from "@/components/ui/tooltip";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", color: "#fff", background: "#1a1a2e", minHeight: "100vh" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>エラーが発生しました</h1>
          <pre style={{ color: "#f87171", whiteSpace: "pre-wrap", fontSize: "0.875rem" }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              background: "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            再読み込み
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/deck/:deckId" element={<DeckDetailPage />} />
              <Route path="/study/:deckId" element={<StudyPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
