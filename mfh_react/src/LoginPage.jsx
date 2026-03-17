import { useState } from "react";
import { setAuth } from "./auth";

export default function LoginPage({ onLogin }) {
  const [form,    setForm]    = useState({ username: "", password: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Erreur de connexion."); return; }
      const userData = { username: data.username, fullname: data.fullname, role: data.role };
      setAuth(data.token, userData);
      onLogin(userData);
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #1e3a5f 0%, #0891b2 100%)",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "40px 36px",
        width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {/* Logo / titre */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: "0 auto 12px",
            background: "linear-gradient(135deg,#1e3a5f,#0891b2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26,
          }}>🏘️</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1e3a5f" }}>MFH</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Gestion immobilière</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
              Utilisateur
            </label>
            <input
              autoFocus
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
                border: "1px solid #d1d5db", fontSize: 14, outline: "none",
              }}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
                border: "1px solid #d1d5db", fontSize: 14, outline: "none",
              }}
              required
            />
          </div>

          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fca5a5",
              borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#dc2626",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4, padding: "11px 0", borderRadius: 8,
              background: loading ? "#93c5fd" : "#2563eb",
              color: "#fff", border: "none", fontSize: 15,
              fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
