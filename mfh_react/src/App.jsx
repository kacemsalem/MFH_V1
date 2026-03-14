import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import LotPage from "./LotPage";
import ClientPage from "./ClientPage";
import NotairePage from "./NotairePage";
import CommercialPage from "./CommercialPage";
import DossierPage from "./DossierPage";

function PlaceholderPage({ title }) {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e40af", marginBottom: 16 }}>{title}</h1>
      <p style={{ color: "#6b7280" }}>Page à compléter.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/lots" replace />} />
          <Route path="/lots"       element={<LotPage />} />
          <Route path="/clients"    element={<ClientPage />} />
          <Route path="/dossiers"   element={<DossierPage />} />
          <Route path="/notaire"    element={<NotairePage />} />
          <Route path="/commercial" element={<CommercialPage />} />
          <Route path="/synthese"   element={<PlaceholderPage title="Synthèse" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
