import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const BASE = "/api";

// ── Couleurs par statut ───────────────────────────────────────────────────────
const SIT = {
  LIBRE:   { bg: "#f0fdf4", border: "#16a34a", badge: "#16a34a", label: "Libre"    },
  OPTION:  { bg: "#fffbeb", border: "#d97706", badge: "#d97706", label: "Option"   },
  RESERVE: { bg: "#eff6ff", border: "#2563eb", badge: "#2563eb", label: "Réservé"  },
  VENDU:   { bg: "#fef2f2", border: "#dc2626", badge: "#dc2626", label: "Vendu"    },
};

const TRANCHE_COLOR = "#64748b"; // gris ardoise uniforme

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = v => v ? v.split("-").reverse().join("/") : "";
const fmt     = v => Number(v || 0).toLocaleString("fr-FR");

// ── StatBadge ─────────────────────────────────────────────────────────────────
function StatBadge({ color, label, count }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: "#fff", border: `1.5px solid ${color}40`,
      borderRadius: 20, padding: "4px 12px",
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color }}>{count}</span>
    </div>
  );
}

// ── LotCard ───────────────────────────────────────────────────────────────────
function LotCard({ lot, onActivateOption, onCancelOption, onCreateDossier, canOption, isCommercial }) {
  const sit = SIT[lot.situation] || SIT.LIBRE;
  return (
    <div style={{
      background: sit.bg,
      border: `1.5px solid ${sit.border}30`,
      borderLeft: `4px solid ${sit.border}`,
      borderRadius: 10,
      padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: 8,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", lineHeight: 1.3 }}>
          {lot.n_titre || `Îlot ${lot.ilot} – Lot ${lot.lot}`}
        </div>
        <span style={{
          background: `${sit.badge}18`, color: sit.badge,
          border: `1px solid ${sit.badge}40`,
          fontSize: 9, fontWeight: 700, padding: "2px 8px",
          borderRadius: 10, letterSpacing: 0.5, whiteSpace: "nowrap", flexShrink: 0,
        }}>
          {sit.label}
        </span>
      </div>

      {/* Infos compactes */}
      <div style={{ fontSize: 12, color: "#475569" }}>
        {lot.n_titre && (
          <div style={{ color: "#94a3b8", marginBottom: 2 }}>Îlot {lot.ilot} – Lot {lot.lot}</div>
        )}
        {/* Prix sur une ligne */}
        {(() => {
          const isVente = (lot.situation === "VENDU" || lot.situation === "RESERVE") && lot.dossier_prix_vente;
          const prixVal = isVente ? lot.dossier_prix_vente : lot.prix_reference;
          const prixTag = isVente ? "(P. vente)" : "(P. réf)";
          const pm2 = lot.surface > 0 && prixVal > 0 ? Math.round(Number(prixVal) / lot.surface) : 0;
          return prixVal ? (
            <div style={{ marginBottom: 2 }}>
              <span style={{ color: "#94a3b8" }}>Prix </span>
              <b style={{ color: "#1e3a8a", fontFamily: "monospace" }}>{fmt(prixVal)}</b>
              {" "}<span style={{ color: "#94a3b8", fontSize: 10 }}>{prixTag}</span>
              {pm2 > 0 && <span style={{ color: "#94a3b8", fontSize: 10 }}> · {fmt(pm2)}/m²</span>}
            </div>
          ) : null;
        })()}
        {/* Surface + catégorie sur une ligne */}
        {(lot.surface > 0 || lot.categorie) && (
          <div style={{ color: "#64748b", fontSize: 11 }}>
            {lot.surface > 0 && <span>{lot.surface} m²</span>}
            {lot.surface > 0 && lot.categorie && <span> · </span>}
            {lot.categorie && <span>{lot.categorie}</span>}
          </div>
        )}
      </div>

      {/* Option active */}
      {lot.situation === "OPTION" && (
        <div style={{
          background: "#fef3c7", border: "1px solid #d97706", borderRadius: 8,
          padding: "6px 10px", fontSize: 12,
        }}>
          <div style={{ fontWeight: 700, color: "#92400e" }}>
            {lot.commercial_option_display || "Commercial inconnu"}
          </div>
          {lot.date_option && (
            <div style={{ color: "#78350f", marginTop: 2 }}>
              Depuis le {fmtDate(lot.date_option)}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {canOption && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
          {lot.situation === "LIBRE" && (
            <button onClick={() => onActivateOption(lot)} style={{
              flex: 1, background: "#d97706", color: "#fff", border: "none",
              borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", minWidth: 80,
            }}>
              Activer option
            </button>
          )}
          {lot.situation === "OPTION" && (
            <>
              <button onClick={() => onCancelOption(lot)} style={{
                flex: 1, background: "transparent", color: "#dc2626",
                border: "1px solid #dc2626", borderRadius: 6,
                padding: "6px 10px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", minWidth: 70,
              }}>
                Annuler
              </button>
              {!isCommercial && (
                <button onClick={() => onCreateDossier(lot)} style={{
                  flex: 1, background: "#2563eb", color: "#fff", border: "none",
                  borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", minWidth: 100,
                }}>
                  Créer dossier
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function LotKanbanPage() {
  const { role }      = useAuth();
  const canOption     = role === "ADMIN" || role === "COMMERCIAL"; // peut activer/annuler options
  const isCommercial  = role === "COMMERCIAL"; // pas de sélection de commercial (backend auto-détecte)
  const isMobile      = useIsMobile();
  const navigate      = useNavigate();

  const [lots, setLots]           = useState([]);
  const [commerciaux, setCommerciaux] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refresh, setRefresh]     = useState(false);
  const [error, setError]         = useState("");

  // Filtres
  const [filtSit,     setFiltSit]     = useState("");
  const [filtCat,     setFiltCat]     = useState("");
  const [filtComm,    setFiltComm]    = useState("");
  const [filtSurfMin, setFiltSurfMin] = useState("");
  const [filtSurfMax, setFiltSurfMax] = useState("");
  const [filtTranche, setFiltTranche] = useState("");

  // Modal option
  const [optionModal,   setOptionModal]   = useState(null);  // { lot }
  const [selectedComm,  setSelectedComm]  = useState("");
  const [optionMemo,    setOptionMemo]    = useState("");
  const [optionLoading, setOptionLoading] = useState(false);
  const [optionError,   setOptionError]   = useState("");

  // Chargement données
  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${BASE}/lots/`).then(r => r.json()),
      fetch(`${BASE}/commerciaux/`).then(r => r.json()),
    ])
      .then(([l, c]) => { setLots(l); setCommerciaux(c); })
      .catch(() => setError("Erreur de chargement."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load, refresh]);

  // Valeurs uniques pour filtres
  const uniqCats     = [...new Set(lots.map(l => l.categorie || "").filter(Boolean))].sort();
  const uniqTranches = [...new Set(lots.map(l => l.tranche   || "").filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Appliquer filtres
  const filtered = lots.filter(l => {
    if (filtSit    && l.situation !== filtSit)                           return false;
    if (filtCat    && l.categorie !== filtCat)                           return false;
    if (filtTranche && l.tranche  !== filtTranche)                       return false;
    if (filtComm   && String(l.commercial_option) !== String(filtComm)) return false;
    if (filtSurfMin && Number(l.surface) < Number(filtSurfMin))         return false;
    if (filtSurfMax && Number(l.surface) > Number(filtSurfMax))         return false;
    return true;
  });

  // Regrouper par tranche
  const tranchesMap = {};
  filtered.forEach(lot => {
    const t = lot.tranche || "—";
    if (!tranchesMap[t]) tranchesMap[t] = [];
    tranchesMap[t].push(lot);
  });
  const tranches = Object.keys(tranchesMap)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Stats globales (tous lots, sans filtre)
  const stats = {
    libre:   lots.filter(l => l.situation === "LIBRE").length,
    option:  lots.filter(l => l.situation === "OPTION").length,
    reserve: lots.filter(l => l.situation === "RESERVE").length,
    vendu:   lots.filter(l => l.situation === "VENDU").length,
  };

  // Activer option — toujours via modale (confirmation pour COMMERCIAL, sélection pour ADMIN)
  const openOptionModal = (lot) => {
    setOptionModal({ lot });
    setSelectedComm("");
    setOptionMemo("");
    setOptionError("");
  };

  // COMMERCIAL : activation directe (appelée depuis la modale de confirmation)
  const handleDirectActivate = async (lot) => {
    setOptionLoading(true); setOptionError("");
    try {
      const res = await fetch(`${BASE}/lots/${lot.id}/option/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ obs: optionMemo }),
      });
      if (!res.ok) {
        const d = await res.json();
        setOptionError(d.error || "Erreur lors de l'activation.");
        return;
      }
      setOptionModal(null);
      setRefresh(r => !r);
    } catch { setOptionError("Erreur de connexion."); }
    finally { setOptionLoading(false); }
  };

  // ADMIN : activation via modal avec sélection de commercial
  const handleActivateOption = async (e) => {
    e.preventDefault();
    if (!selectedComm) { setOptionError("Sélectionner un commercial."); return; }
    setOptionLoading(true); setOptionError("");
    try {
      const res = await fetch(`${BASE}/lots/${optionModal.lot.id}/option/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commercial: selectedComm, obs: optionMemo }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || Object.values(d).flat().join(" | "));
      }
      setOptionModal(null);
      setRefresh(r => !r);
    } catch (err) { setOptionError(err.message); }
    finally { setOptionLoading(false); }
  };

  // Annuler option
  const handleCancelOption = async (lot) => {
    if (!window.confirm(`Annuler l'option sur ${lot.n_titre || `Lot ${lot.lot}`} ?`)) return;
    const res = await fetch(`${BASE}/lots/${lot.id}/option/`, { method: "DELETE" });
    if (res.ok) {
      setRefresh(r => !r);
    } else {
      const d = await res.json();
      alert(d.error || "Erreur.");
    }
  };

  // Créer dossier
  const handleCreateDossier = (lot) => {
    navigate("/dossiers");
  };

  // Réinitialiser filtres
  const hasFiltre = filtSit || filtCat || filtTranche || filtComm || filtSurfMin || filtSurfMax;
  const resetFiltres = () => {
    setFiltSit(""); setFiltCat(""); setFiltTranche("");
    setFiltComm(""); setFiltSurfMin(""); setFiltSurfMax("");
  };

  // ── Styles communs ──────────────────────────────────────────────────────────
  const sel = {
    border: "1px solid #e2e8f0", borderRadius: 6,
    padding: "6px 10px", fontSize: 13, background: "#fff",
    color: "#374151", cursor: "pointer",
  };
  const inp = {
    border: "1px solid #e2e8f0", borderRadius: 6,
    padding: "6px 10px", fontSize: 13, background: "#fff",
    color: "#374151", width: 90,
  };
  const pill = (label, val, active, color) => (
    <button onClick={() => setFiltSit(active ? "" : val)} key={val} style={{
      padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
      cursor: "pointer", border: "none",
      background: active ? color : "#e2e8f0",
      color: active ? "#fff" : "#475569",
    }}>
      {label}
    </button>
  );

  // ── Rendu ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100%" }}>

      {/* ── En-tête ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e3a5f", margin: 0 }}>
          Options Commerciales
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatBadge color="#16a34a" label="Libre"    count={stats.libre} />
          <StatBadge color="#d97706" label="Option"   count={stats.option} />
          <StatBadge color="#2563eb" label="Réservé"  count={stats.reserve} />
          <StatBadge color="#dc2626" label="Vendu"    count={stats.vendu} />
        </div>
      </div>

      {/* ── Barre de filtres ── */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: "14px 16px",
        border: "1px solid #e5e7eb", marginBottom: 20,
        display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center",
      }}>
        {/* Statut pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {pill("Tous",     "",        !filtSit,              "#1e293b")}
          {pill("Libre",    "LIBRE",   filtSit === "LIBRE",   "#16a34a")}
          {pill("Option",   "OPTION",  filtSit === "OPTION",  "#d97706")}
          {pill("Réservé",  "RESERVE", filtSit === "RESERVE", "#2563eb")}
          {pill("Vendu",    "VENDU",   filtSit === "VENDU",   "#dc2626")}
        </div>

        <div style={{ width: 1, height: 24, background: "#e2e8f0", flexShrink: 0 }} />

        {/* Tranche */}
        <select style={sel} value={filtTranche} onChange={e => setFiltTranche(e.target.value)}>
          <option value="">Toutes tranches</option>
          {uniqTranches.map(t => <option key={t} value={t}>Tr. {t}</option>)}
        </select>

        {/* Catégorie */}
        <select style={sel} value={filtCat} onChange={e => setFiltCat(e.target.value)}>
          <option value="">Toutes catégories</option>
          {uniqCats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Commercial */}
        <select style={sel} value={filtComm} onChange={e => setFiltComm(e.target.value)}>
          <option value="">Tous commerciaux</option>
          {commerciaux.map(c => <option key={c.id} value={c.id}>{c.nom_prenom}</option>)}
        </select>

        {/* Surface min/max */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="number" placeholder="Surface ≥" value={filtSurfMin}
            onChange={e => setFiltSurfMin(e.target.value)} style={inp} />
          <span style={{ color: "#9ca3af", fontSize: 12 }}>–</span>
          <input type="number" placeholder="≤ m²" value={filtSurfMax}
            onChange={e => setFiltSurfMax(e.target.value)} style={inp} />
        </div>

        {hasFiltre && (
          <button onClick={resetFiltres} style={{
            ...sel, color: "#dc2626", borderColor: "#fca5a5", fontWeight: 700,
          }}>
            ✕ Effacer
          </button>
        )}

        <span style={{ marginLeft: "auto", fontSize: 13, color: "#6b7280", whiteSpace: "nowrap" }}>
          {filtered.length} lot{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Contenu ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af", fontSize: 14 }}>
          Chargement…
        </div>
      )}

      {!loading && error && (
        <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 14px" }}>
          {error}
        </div>
      )}

      {!loading && !error && tranches.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af", fontSize: 14 }}>
          Aucun lot correspondant aux filtres.
        </div>
      )}

      {/* Kanban groupé par tranche */}
      {!loading && tranches.map((tranche) => {
        const color   = TRANCHE_COLOR;
        const cards   = tranchesMap[tranche];
        const nLibre  = cards.filter(l => l.situation === "LIBRE").length;
        const nOpt    = cards.filter(l => l.situation === "OPTION").length;
        const nRes    = cards.filter(l => l.situation === "RESERVE").length;
        const nVendu  = cards.filter(l => l.situation === "VENDU").length;

        return (
          <div key={tranche} style={{ marginBottom: 24 }}>
            {/* En-tête tranche */}
            <div style={{
              background: color, color: "#fff",
              borderRadius: "10px 10px 0 0", padding: "9px 18px",
              display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            }}>
              <span style={{ fontWeight: 800, fontSize: 15, minWidth: 100 }}>
                Tranche {tranche}
              </span>
              <span style={{ fontSize: 12, opacity: 0.9, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700 }}>{cards.length} lots</span>
                <span>·</span>
                {nLibre  > 0 && <span>🟢 {nLibre} libre{nLibre  > 1 ? "s" : ""}</span>}
                {nOpt    > 0 && <span>🟡 {nOpt}   option{nOpt    > 1 ? "s" : ""}</span>}
                {nRes    > 0 && <span>🔵 {nRes}   réservé{nRes   > 1 ? "s" : ""}</span>}
                {nVendu  > 0 && <span>🔴 {nVendu} vendu{nVendu  > 1 ? "s" : ""}</span>}
              </span>
            </div>

            {/* Grille de cartes */}
            <div style={{
              background: "#f1f5f9",
              borderRadius: "0 0 10px 10px",
              padding: "12px",
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 10,
            }}>
              {cards.map(lot => (
                <LotCard
                  key={lot.id}
                  lot={lot}
                  onActivateOption={openOptionModal}
                  onCancelOption={handleCancelOption}
                  onCreateDossier={handleCreateDossier}
                  canOption={canOption}
                  isCommercial={isCommercial}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* ── Modal activation option ── */}
      {optionModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 28,
            width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#1e3a5f", marginBottom: 6 }}>
              Activer une option
            </div>

            {/* Détails du lot */}
            <div style={{
              background: "#fffbeb", border: "1px solid #fde68a",
              borderRadius: 10, padding: "12px 16px", marginBottom: 18,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#92400e", marginBottom: 4 }}>
                🏠 {optionModal.lot.n_titre || `Îlot ${optionModal.lot.ilot} – Lot ${optionModal.lot.lot}`}
              </div>
              <div style={{ fontSize: 12, color: "#78350f", display: "flex", gap: 12, flexWrap: "wrap" }}>
                {optionModal.lot.tranche   && <span>📍 Tranche <b>{optionModal.lot.tranche}</b></span>}
                {optionModal.lot.categorie && <span>🏷️ {optionModal.lot.categorie}</span>}
                {optionModal.lot.surface   > 0 && <span>📐 {optionModal.lot.surface} m²</span>}
              </div>
            </div>

            {/* Mémo optionnel — commun aux deux rôles */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Mémo <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optionnel)</span>
              </label>
              <textarea
                value={optionMemo}
                onChange={e => setOptionMemo(e.target.value)}
                placeholder="Remarque, contact client…"
                rows={2}
                style={{
                  width: "100%", border: "1px solid #e2e8f0", borderRadius: 8,
                  padding: "8px 10px", fontSize: 13, resize: "vertical",
                  fontFamily: "inherit", color: "#374151", boxSizing: "border-box",
                }}
              />
            </div>

            {isCommercial ? (
              /* ── Confirmation simple pour COMMERCIAL ── */
              <div style={{ display: "grid", gap: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                  Voulez-vous activer une <strong>option</strong> sur ce lot ?<br />
                  <span style={{ color: "#6b7280", fontSize: 12 }}>
                    L'option sera enregistrée à votre nom avec la date d'aujourd'hui.
                  </span>
                </p>

                {optionError && (
                  <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                    {optionError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => handleDirectActivate(optionModal.lot)}
                    disabled={optionLoading}
                    style={{
                      flex: 1, padding: "10px 0", background: "#d97706", color: "#fff",
                      border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14,
                      cursor: optionLoading ? "not-allowed" : "pointer",
                      opacity: optionLoading ? 0.7 : 1,
                    }}>
                    {optionLoading ? "Enregistrement…" : "✅ Confirmer l'option"}
                  </button>
                  <button type="button" onClick={() => setOptionModal(null)} style={{
                    flex: 1, padding: "10px 0", background: "#f1f5f9", color: "#6b7280",
                    border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}>
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              /* ── Sélection du commercial pour ADMIN ── */
              <form onSubmit={handleActivateOption} style={{ display: "grid", gap: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  Commercial *
                  <select value={selectedComm}
                    onChange={e => setSelectedComm(e.target.value)}
                    required
                    style={{
                      display: "block", width: "100%", marginTop: 4,
                      border: "1px solid #e5e7eb", borderRadius: 6,
                      padding: "8px 10px", fontSize: 13,
                    }}>
                    <option value="">— sélectionner —</option>
                    {commerciaux.map(c => (
                      <option key={c.id} value={c.id}>{c.nom_prenom}</option>
                    ))}
                  </select>
                </label>

                {optionError && (
                  <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                    {optionError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button type="submit" disabled={optionLoading} style={{
                    flex: 1, padding: "10px 0", background: "#d97706", color: "#fff",
                    border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
                    opacity: optionLoading ? 0.7 : 1,
                  }}>
                    {optionLoading ? "Enregistrement…" : "Confirmer"}
                  </button>
                  <button type="button" onClick={() => setOptionModal(null)} style={{
                    flex: 1, padding: "10px 0", background: "#f1f5f9", color: "#6b7280",
                    border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}>
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
