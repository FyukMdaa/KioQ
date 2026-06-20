// ============================================================
// KioQ アプリケーションルート
// ============================================================
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { HomePage } from "@/pages/Home";
import { DeckDetailPage } from "@/pages/DeckDetail";
import { StudyPage } from "@/pages/Study";
import { SettingsPage } from "@/pages/Settings";
import { ImportPage } from "@/pages/Import";

export default function App() {
  return (
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
  );
}
