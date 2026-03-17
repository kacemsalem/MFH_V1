import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

const BASE = "/api";

const SIT = {
  LIBRE:   { label: "Libre",   bg: "#16a34a", light: "#f0fdf4", border: "#bbf7d0", text: "#fff" },
  OPTION:  { label: "Option",  bg: "#d97706", light: "#fffbeb", border: "#fde68a", text: "#fff" },
  RESERVE: { label: "Réservé", bg: "#2563eb", light: "#eff6ff", border: "#bfdbfe", text: "#fff" },
};

const fmtDate = v => v ? v.split("-").reverse().join("/") : "—";

function daysBadge(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  const color = diff === 0 ? "#16a34a" : diff < 30 ? "#d97706" : "#dc2626";
  const label = diff === 0 ? "Aujourd'hui" : `${diff}j`;
  return { color, label };
}

/* ─── Carte lot (mobile-first) ─── */
function LotCard({ lot, onActivate, onCancel, canOption, myCommId, isAdmin }) {
  const sit      = SIT[lot.situation] || SIT.LIBRE;
  const isMyOpt  = myCommId != null && lot.commercial_option === myCommId;
  const canCancel = isAdmin || isMyOpt;   // ADMIN annule tout, commercial uniquement les siennes
  const badge    = lot.situation === "OPTION" ? daysBadge(lot.date_option) : null;

  return (
    <div style={{
      background: sit.light,
      border: `1px solid ${sit.border}`,
      borderLeft: `5px solid ${sit.bg}`,
      borderRadius: 12,
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      {/* Ligne 1 : titre + badge situation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 15, color: "#1e293b", lineHeight: 1.3, flex: 1 }}>
          {lot.n_titre || `Îlot ${lot.ilot} – Lot ${lot.lot}`}
        </span>
        <span style={{
          background: sit.bg, color: sit.text,
          fontSize: 10, fontWeight: 700, padding: "3px 8px",
          borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0,
        }}>
          {sit.label}
        </span>
      </div>

      {/* Ligne 2 : méta */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", fontSize: 12, color: "#64748b" }}>
        {lot.tranche   && <span>📍 <b>Tr. {lot.tranche}</b></span>}
        {lot.categorie && <span>🏷 {lot.categorie}</span>}
        {lot.surface > 0 && <span>📐 {lot.surface} m²</span>}
        {lot.n_titre   && <span style={{ color: "#94a3b8" }}>Îlot {lot.ilot} · Lot {lot.lot}</span>}
      </div>

      {/* Ligne 3 : info option (si OPTION) */}
      {lot.situation === "OPTION" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#92400e" }}>
            💼 {lot.commercial_option_display || "—"}
          </span>
          <span style={{ fontSize: 11, color: "#78350f" }}>
            📅 {fmtDate(lot.date_option)}
          </span>
          {badge && (
            <span style={{
              background: badge.color, color: "#fff",
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            }}>
              {badge.label}
            </span>
          )}
          {isMyOpt && (
            <span style={{
              background: "#7c3aed", color: "#fff",
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            }}>
              ⭐ Mon option
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      {canOption && (
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {lot.situation === "LIBRE" && (
            <button onClick={() => onActivate(lot)} style={{
              flex: 1, padding: "8px 0", background: "#fff7ed", color: "#92400e",
              border: "1px solid #fcd34d", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}>
              Activer option
            </button>
          )}
          {lot.situation === "OPTION" && canCancel && (
            <button onClick={() => onCancel(lot)} style={{
              flex: 1, padding: "8px 0", background: "#fff1f2", color: "#9f1239",
              border: "1px solid #fca5a5", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}>
              Annuler option
            </button>
          )}
          {lot.situation === "OPTION" && !canCancel && (
            <div style={{
              flex: 1, padding: "8px 0", background: "#f8fafc", color: "#94a3b8",
              border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 500,
              fontSize: 12, textAlign: "center",
            }}>
              Option d'un autre commercial
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Pill de filtre ─── */
function Pill({ label, active, onClick, color = "#1e293b", count }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
        cursor: "pointer", border: "none", whiteSpace: "nowrap", flexShrink: 0,
        background: active ? color : "#e2e8f0",
        color: active ? "#fff" : "#475569",
        boxShadow: active ? `0 2px 6px ${color}55` : "none",
        transition: "all 0.15s",
      }}
    >
      {label}{count != null ? ` (${count})` : ""}
    </button>
  );
}

/* ─── Page principale ─── */
export default function LotsMobilePage() {
  const { user, role } = useAuth();
  const isCommercial  = role === "COMMERCIAL";
  const isAdmin       = role === "ADMIN";
  const canOption     = isAdmin || isCommercial;

  // Résolution robuste de commercial_id (session courante ou fetch /me/)
  const [myCommId, setMyCommId] = useState(user?.commercial_id ?? null);
  useEffect(() => {
    if (myCommId != null) return;          // déjà connu
    if (!isCommercial && !isAdmin) return; // pas besoin pour VIEWER
    fetch("/api/auth/me/")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.commercial_id != null) setMyCommId(data.commercial_id); })
      .catch(() => {});
  }, []);

  const showMesOpts = isCommercial || myCommId != null;

  const [lots,    setLots]    = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [filtSit,      setFiltSit]      = useState("");        // "" | LIBRE | OPTION | RESERVE
  const [filtTranche,  setFiltTranche]  = useState("");
  const [filtCat,      setFiltCat]      = useState("");
  const [filtMesOpts,  setFiltMesOpts]  = useState(false);

  // Modal confirmation
  const [modal,        setModal]        = useState(null);      // { lot }
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError,   setModalError]   = useState("");
  const [memo,         setMemo]         = useState("");

  // Annulation confirm
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${BASE}/lots/`)
      .then(r => r.json())
      .then(data => {
        // Garder uniquement lots non vendus
        setLots(data.filter(l => l.situation !== "VENDU"));
      })
      .catch(() => setLots([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Valeurs uniques pour les filtres */
  const uniqTranches = [...new Set(lots.map(l => l.tranche).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const uniqCats = [...new Set(lots.map(l => l.categorie).filter(Boolean))].sort();

  /* Appliquer filtres */
  const filtered = lots.filter(l => {
    if (filtSit     && l.situation !== filtSit) return false;
    if (filtTranche && l.tranche   !== filtTranche) return false;
    if (filtCat     && l.categorie !== filtCat) return false;
    if (filtMesOpts && (myCommId == null || l.commercial_option !== myCommId)) return false;
    return true;
  });

  /* Compteurs pour les pills */
  const cnt = (sit) => lots.filter(l => l.situation === sit).length;
  const cntMes = lots.filter(l => l.commercial_option === myCommId && myCommId != null).length;

  /* Activer option */
  const handleActivate = async () => {
    if (!modal) return;
    setModalLoading(true); setModalError("");
    try {
      const res = await fetch(`${BASE}/lots/${modal.lot.id}/option/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ obs: memo }),
      });
      if (!res.ok) {
        const d = await res.json();
        setModalError(d.error || "Erreur.");
        return;
      }
      setModal(null);
      load();
    } catch { setModalError("Erreur de connexion."); }
    finally { setModalLoading(false); }
  };

  /* Annuler option */
  const handleCancel = async (lot) => {
    setModalLoading(true);
    try {
      const res = await fetch(`${BASE}/lots/${lot.id}/option/`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Erreur.");
      } else {
        load();
      }
    } catch { alert("Erreur de connexion."); }
    finally { setModalLoading(false); setCancelTarget(null); }
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>

      {/* ── Barre de filtres sticky ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: "#f9fafb",
        borderBottom: "1px solid #e5e7eb",
        padding: "10px 0 8px",
        marginBottom: 14,
      }}>
        {/* Ligne 1 : Situation + Mes options */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 2px 6px", scrollbarWidth: "none" }}>
          <Pill label="Tous"         active={!filtSit && !filtMesOpts} onClick={() => { setFiltSit(""); setFiltMesOpts(false); }} color="#1e293b" count={lots.length} />
          <Pill label="🟢 Libre"     active={filtSit==="LIBRE"}        onClick={() => { setFiltMesOpts(false); setFiltSit(s => s==="LIBRE"   ? "" : "LIBRE");   }} color="#16a34a" count={cnt("LIBRE")} />
          <Pill label="🟡 Option"    active={filtSit==="OPTION"}       onClick={() => { setFiltMesOpts(false); setFiltSit(s => s==="OPTION"  ? "" : "OPTION");  }} color="#d97706" count={cnt("OPTION")} />
          <Pill label="🔵 Réservé"   active={filtSit==="RESERVE"}      onClick={() => { setFiltMesOpts(false); setFiltSit(s => s==="RESERVE" ? "" : "RESERVE"); }} color="#2563eb" count={cnt("RESERVE")} />
          {showMesOpts && (
            <Pill label="⭐ Mes options" active={filtMesOpts}
              onClick={() => { setFiltMesOpts(v => !v); setFiltSit(""); }}
              color="#7c3aed" count={cntMes} />
          )}
        </div>

        {/* Ligne 2 : Tranche + Catégorie côte à côte */}
        <div style={{ display: "flex", gap: 8, padding: "2px 2px 0" }}>
          <select
            value={filtTranche}
            onChange={e => setFiltTranche(e.target.value)}
            style={{
              flex: 1, padding: "8px 10px", borderRadius: 8,
              border: `1px solid ${filtTranche ? "#2563eb" : "#e2e8f0"}`,
              fontSize: 13, background: "#fff",
              color: filtTranche ? "#1e293b" : "#9ca3af",
              fontWeight: filtTranche ? 600 : 400,
            }}
          >
            <option value="">Toutes tranches</option>
            {uniqTranches.map(t => <option key={t} value={t}>Tranche {t}</option>)}
          </select>
          <select
            value={filtCat}
            onChange={e => setFiltCat(e.target.value)}
            style={{
              flex: 1, padding: "8px 10px", borderRadius: 8,
              border: `1px solid ${filtCat ? "#2563eb" : "#e2e8f0"}`,
              fontSize: 13, background: "#fff",
              color: filtCat ? "#1e293b" : "#9ca3af",
              fontWeight: filtCat ? 600 : 400,
            }}
          >
            <option value="">Toutes catégories</option>
            {uniqCats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Résumé + effacer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 2px 0" }}>
          <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
            {filtered.length} lot{filtered.length !== 1 ? "s" : ""}
            {(filtSit || filtTranche || filtCat || filtMesOpts) ? " (filtrés)" : ""}
          </span>
          {(filtSit || filtTranche || filtCat || filtMesOpts) && (
            <button
              onClick={() => { setFiltSit(""); setFiltTranche(""); setFiltCat(""); setFiltMesOpts(false); }}
              style={{ fontSize: 12, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
            >
              ✕ Effacer
            </button>
          )}
        </div>
      </div>

      {/* ── Contenu ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "#9ca3af" }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#9ca3af", fontSize: 14 }}>
          Aucun lot correspondant.
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 10,
        }}>
          {filtered.map(lot => (
            <LotCard
              key={lot.id}
              lot={lot}
              onActivate={l => { setModal({ lot: l }); setModalError(""); setMemo(""); }}
              onCancel={l => setCancelTarget(l)}
              canOption={canOption}
              myCommId={myCommId}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* ── Modal confirmation activation ── */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center",
          padding: "0 0 0 0",
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "20px 20px 0 0",
            padding: "24px 20px 32px",
            width: "100%",
            maxWidth: 480,
            boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
          }}>
            {/* Poignée */}
            <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 18px" }} />

            <div style={{ fontWeight: 800, fontSize: 18, color: "#1e3a5f", marginBottom: 14 }}>
              Activer une option
            </div>

            {/* Info lot */}
            <div style={{
              background: "#fffbeb", border: "1px solid #fde68a",
              borderRadius: 10, padding: "12px 14px", marginBottom: 16,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#92400e" }}>
                🏠 {modal.lot.n_titre || `Îlot ${modal.lot.ilot} – Lot ${modal.lot.lot}`}
              </div>
              <div style={{ fontSize: 12, color: "#78350f", marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
                {modal.lot.tranche   && <span>📍 Tranche <b>{modal.lot.tranche}</b></span>}
                {modal.lot.categorie && <span>🏷 {modal.lot.categorie}</span>}
                {modal.lot.surface > 0 && <span>📐 {modal.lot.surface} m²</span>}
              </div>
            </div>

            <p style={{ margin: "0 0 12px", fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
              Confirmer l'activation d'une <strong>option</strong> sur ce lot ?<br />
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                Enregistrée à votre nom — {new Date().toLocaleDateString("fr-FR")}.
              </span>
            </p>

            {/* Mémo optionnel */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Mémo <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optionnel)</span>
              </label>
              <textarea
                value={memo}
                onChange={e => setMemo(e.target.value)}
                placeholder="Remarque, contact client…"
                rows={2}
                style={{
                  width: "100%", border: "1px solid #e2e8f0", borderRadius: 8,
                  padding: "8px 10px", fontSize: 13, resize: "vertical",
                  fontFamily: "inherit", color: "#374151", boxSizing: "border-box",
                }}
              />
            </div>

            {modalError && (
              <div style={{
                background: "#fee2e2", color: "#991b1b",
                borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12,
              }}>
                {modalError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleActivate}
                disabled={modalLoading}
                style={{
                  flex: 1, padding: "13px 0",
                  background: modalLoading ? "#fbbf24" : "#d97706",
                  color: "#fff", border: "none", borderRadius: 10,
                  fontWeight: 800, fontSize: 15, cursor: "pointer",
                }}
              >
                {modalLoading ? "…" : "✅ Confirmer"}
              </button>
              <button
                onClick={() => setModal(null)}
                style={{
                  flex: 1, padding: "13px 0", background: "#f1f5f9",
                  color: "#6b7280", border: "none", borderRadius: 10,
                  fontWeight: 700, fontSize: 15, cursor: "pointer",
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmation annulation ── */}
      {cancelTarget && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div style={{
            background: "#fff", borderRadius: "20px 20px 0 0",
            padding: "24px 20px 32px", width: "100%", maxWidth: 480,
            boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
          }}>
            <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 18px" }} />
            <div style={{ fontWeight: 800, fontSize: 18, color: "#dc2626", marginBottom: 12 }}>
              Annuler l'option
            </div>
            <div style={{
              background: "#fef2f2", border: "1px solid #fca5a5",
              borderRadius: 10, padding: "12px 14px", marginBottom: 16,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#991b1b" }}>
                🏠 {cancelTarget.n_titre || `Îlot ${cancelTarget.ilot} – Lot ${cancelTarget.lot}`}
              </div>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "#374151" }}>
              Voulez-vous annuler cette option ? Le lot reviendra en statut <strong>Libre</strong>.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => handleCancel(cancelTarget)}
                disabled={modalLoading}
                style={{
                  flex: 1, padding: "13px 0", background: "#dc2626",
                  color: "#fff", border: "none", borderRadius: 10,
                  fontWeight: 800, fontSize: 15, cursor: "pointer",
                }}
              >
                {modalLoading ? "…" : "Annuler l'option"}
              </button>
              <button
                onClick={() => setCancelTarget(null)}
                style={{
                  flex: 1, padding: "13px 0", background: "#f1f5f9",
                  color: "#6b7280", border: "none", borderRadius: 10,
                  fontWeight: 700, fontSize: 15, cursor: "pointer",
                }}
              >
                Retour
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
