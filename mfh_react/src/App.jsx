import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import Layout from "./Layout";
import LoginPage from "./LoginPage";
import { getUser, clearAuth, setAuth, getToken } from "./auth";

const LotPage       = lazy(() => import("./LotPage"));
const LotKanbanPage = lazy(() => import("./LotKanbanPage"));
const LotsMobilePage= lazy(() => import("./LotsMobilePage"));
const ClientPage    = lazy(() => import("./ClientPage"));
const NotairePage   = lazy(() => import("./NotairePage"));
const CommercialPage= lazy(() => import("./CommercialPage"));
const DossierPage   = lazy(() => import("./DossierPage"));
const ExportPage              = lazy(() => import("./ExportPage"));
const ConsultationDossierPage = lazy(() => import("./ConsultationDossierPage"));
const SuiviLotsPage           = lazy(() => import("./SuiviLotsPage"));
const SynthesePage  = lazy(() => import("./SynthesePage"));
const UsersPage     = lazy(() => import("./UsersPage"));

function PlaceholderPage({ title }) {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e40af", marginBottom: 16 }}>{title}</h1>
      <p style={{ color: "#6b7280" }}>Page à compléter.</p>
    </div>
  );
}

export default function App() {
  // Exiger user ET token — si token absent (ancienne session), forcer re-login
  const [user, setUser] = useState(() => {
    const u = getUser(); const t = getToken();
    return u && t ? u : null;
  });
  // Rafraîchir depuis /api/auth/me/ si rôle ou commercial_id manquant (ancienne session)
  useEffect(() => {
    if (user && (!user.role || user.commercial_id === undefined)) {
      fetch("/api/auth/me/")
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            const updated = { ...user, role: data.role, fullname: data.fullname, commercial_id: data.commercial_id ?? null };
            setAuth(getToken(), updated);
            setUser(updated);
          } else {
            clearAuth(); setUser(null);
          }
        })
        .catch(() => { clearAuth(); setUser(null); });
    }
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout/", { method: "POST" }).catch(() => {});
    clearAuth();
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  const role = user.role ?? "VIEWER";

  const defaultPath = role === "COMMERCIAL" ? "/lots-mobile"
                    : role === "VIEWER"     ? "/consultation-dossiers"
                    : "/lots";

  const isAdmin = role === "ADMIN" || role === "DIRECTEUR";

  return (
    <AuthContext.Provider value={{ user, role }}>
      <BrowserRouter basename={import.meta.env.VITE_BASE_PATH || ''}>
        <Suspense fallback={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", color:"#94a3b8", fontSize:15 }}>Chargement…</div>}>
        <Routes>
          <Route element={<Layout user={user} onLogout={handleLogout} />}>
            <Route index element={<Navigate to={defaultPath} replace />} />

            {/* ── COMMERCIAL : mobile uniquement ── */}
            {role === "COMMERCIAL" && (
              <Route path="/lots-mobile" element={<LotsMobilePage />} />
            )}

            {/* ── VIEWER (Lecteur) : Direction uniquement ── */}
            {role === "VIEWER" && <>
              <Route path="/consultation-dossiers" element={<ConsultationDossierPage />} />
              <Route path="/suivi-lots"            element={<SuiviLotsPage />} />
              <Route path="/synthese"              element={<SynthesePage />} />
              <Route path="/export"                element={<ExportPage />} />
            </>}

            {/* ── ADMIN + DIRECTEUR : accès complet ── */}
            {isAdmin && <>
              <Route path="/lots"                  element={<LotPage />} />
              <Route path="/lots-kanban"           element={<LotKanbanPage />} />
              <Route path="/lots-mobile"           element={<LotsMobilePage />} />
              <Route path="/clients"               element={<ClientPage />} />
              <Route path="/dossiers"              element={<DossierPage />} />
              <Route path="/notaire"               element={<NotairePage />} />
              <Route path="/commercial"            element={<CommercialPage />} />
              <Route path="/export"                element={<ExportPage />} />
              <Route path="/synthese"              element={<SynthesePage />} />
              <Route path="/consultation-dossiers" element={<ConsultationDossierPage />} />
              <Route path="/suivi-lots"            element={<SuiviLotsPage />} />
              <Route path="/utilisateurs"          element={<UsersPage />} />
            </>}

            {/* Toute URL inconnue ou non autorisée → page par défaut */}
            <Route path="*" element={<Navigate to={defaultPath} replace />} />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
