import { useEffect, useState, useMemo } from "react";

const SIT = {
  RESERVATION: { label: "Réservation", color: "#d97706", bg: "#fffbeb" },
  VENTE:       { label: "Vente",       color: "#16a34a", bg: "#f0fdf4" },
  DESISTEMENT: { label: "Désistement", color: "#dc2626", bg: "#fef2f2" },
};

const fmt  = v => Number(v || 0).toLocaleString("fr-FR");
const fmtD = v => v ? v.split("-").reverse().join("/") : "—";

function DossierCard({ d }) {
  const sit  = SIT[d.situation_dossier] || { label: d.situation_dossier, color: "#6b7280", bg: "#f9fafb" };
  const prix = Number(d.prix_vente   || 0);
  const recu = Number(d.total_recu   || 0);
  const reste= Number(d.montant_restant || 0);
  const pct  = prix > 0 ? Math.min(100, (recu / prix) * 100) : 0;
  const barCol = pct === 100 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";

  const dateD = d.date_vente || d.date_reservation || d.date_desistement;

  return (
    <div style={{
      background: sit.bg, borderRadius: 10, padding: "10px 12px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
      borderLeft: `3px solid ${sit.color}`,
    }}>
      {/* En-tête : situation + date */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{
          background: `${sit.color}15`, color: sit.color,
          border: `1px solid ${sit.color}35`,
          fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 7px", letterSpacing: 0.4,
        }}>{sit.label}</span>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>{fmtD(dateD)}</span>
      </div>

      {/* Référence lot */}
      <div style={{ fontWeight: 700, fontSize: 13, color: "#1e3a8a", marginBottom: 1 }}>
        TR{d.lot_tranche} · Îlot {d.lot_ilot} · Lot {d.lot_lot}
      </div>
      {d.lot_n_titre && (
        <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 600, marginBottom: 4 }}>[{d.lot_n_titre}]</div>
      )}

      {/* Client */}
      <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>
        👤 {d.client_display || "—"}
        {d.lot_categorie && (
          <span style={{
            marginLeft: 6, fontSize: 10, color: "#64748b",
            background: "#f1f5f9", border: "1px solid #e2e8f0",
            borderRadius: 4, padding: "1px 5px",
          }}>{d.lot_categorie}</span>
        )}
      </div>

      {/* Montants compacts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 8 }}>
        {[
          { label: "Prix",  val: prix,  col: sit.color },
          { label: "Reçu",  val: recu,  col: sit.color },
          { label: "Reste", val: reste, col: reste === 0 ? sit.color : "#dc2626" },
        ].map(({ label, val, col }) => (
          <div key={label} style={{
            background: "rgba(255,255,255,0.7)",
            border: `1px solid ${col}30`,
            borderTop: `2px solid ${col}`,
            borderRadius: 7, padding: "5px 6px", textAlign: "center",
          }}>
            <div style={{ fontSize: 9, color: col, fontWeight: 700, marginBottom: 1, opacity: 0.7 }}>{label}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: col, fontFamily: "monospace" }}>{fmt(val)}</div>
          </div>
        ))}
      </div>

      {/* Barre de progression */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, background: "rgba(0,0,0,0.08)", borderRadius: 999, height: 5 }}>
          <div style={{ width: `${pct}%`, background: barCol, height: 5, borderRadius: 999, transition: "width .3s" }} />
        </div>
        <span style={{ fontSize: 10, color: barCol, fontWeight: 700, whiteSpace: "nowrap" }}>{pct.toFixed(0)} %</span>
      </div>
    </div>
  );
}

export default function ConsultationDossierPage() {
  const [dossiers,   setDossiers]   = useState([]);
  const [lotsDispos, setLotsDispos] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filtSit,    setFiltSit]    = useState("TOUS");
  const [filtAnn,    setFiltAnn]    = useState("TOUS");
  const [filtCat,    setFiltCat]    = useState("TOUS");
  const [filtTr,     setFiltTr]     = useState("TOUS");
  const [search,     setSearch]     = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/dossiers/").then(r => r.ok ? r.json() : []),
      fetch("/api/bootstrap/").then(r => r.ok ? r.json() : {}),
    ]).then(([dosData, bootstrap]) => {
      const list = Array.isArray(dosData) ? dosData : (dosData.results || []);
      setDossiers(list.filter(d => d.actif));
      setLotsDispos(bootstrap.lots_libres || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const tranches = useMemo(() => {
    const s = new Set(dossiers.map(d => d.lot_tranche).filter(v => v != null));
    return [...s].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  }, [dossiers]);

  const annees = useMemo(() => {
    const s = new Set();
    dossiers.forEach(d => {
      const dt = d.date_vente || d.date_reservation;
      if (dt) s.add(dt.slice(0, 4));
    });
    return [...s].sort().reverse();
  }, [dossiers]);

  const categories = useMemo(() => {
    const s = new Set(dossiers.map(d => d.lot_categorie).filter(Boolean));
    return [...s].sort();
  }, [dossiers]);

  const filtered = useMemo(() => dossiers.filter(d => {
    if (filtSit !== "TOUS" && d.situation_dossier !== filtSit) return false;
    if (filtTr  !== "TOUS" && String(d.lot_tranche) !== filtTr) return false;
    if (filtAnn !== "TOUS") {
      const dt = d.date_vente || d.date_reservation;
      if (!dt || dt.slice(0, 4) !== filtAnn) return false;
    }
    if (filtCat !== "TOUS" && d.lot_categorie !== filtCat) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(d.client_display || "").toLowerCase().includes(q) &&
          !(d.lot_n_titre    || "").toLowerCase().includes(q) &&
          !String(d.lot_ilot || "").includes(q) &&
          !String(d.lot_lot  || "").includes(q)) return false;
    }
    return true;
  }), [dossiers, filtSit, filtTr, filtAnn, filtCat, search]);

  const stats = useMemo(() => {
    const res = { RESERVATION: 0, VENTE: 0, DESISTEMENT: 0 };
    filtered.forEach(d => { if (res[d.situation_dossier] !== undefined) res[d.situation_dossier]++; });
    return res;
  }, [filtered]);

  const totaux = useMemo(() => {
    let prixVente = 0, encaisse = 0, reste = 0;
    filtered.forEach(d => {
      if (["VENTE", "RESERVATION"].includes(d.situation_dossier))
        prixVente += Number(d.prix_vente || 0);
      encaisse += Number(d.total_recu     || 0);
      reste    += Number(d.montant_restant || 0);
    });
    const dispos = lotsDispos.reduce((s, l) => s + Number(l.prix_reference || 0), 0);
    return { prixVente, encaisse, reste, dispos };
  }, [filtered, lotsDispos]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Chargement…</div>;

  const selStyle = { padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, background: "#fff" };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>

      {/* Résumé financier */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Prix Vente (V+R)", value: totaux.prixVente, color: "#2563eb", bg: "#eff6ff" },
          { label: "Total Encaissé",   value: totaux.encaisse,  color: "#16a34a", bg: "#f0fdf4" },
          { label: "Reste Dû",         value: totaux.reste,     color: "#dc2626", bg: "#fef2f2" },
          { label: "Lots Disponibles", value: totaux.dispos,    color: "#7c3aed", bg: "#faf5ff" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{
            background: bg, border: `1px solid ${color}25`,
            borderRadius: 10, padding: "12px 14px",
            borderLeft: `3px solid ${color}`,
          }}>
            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "monospace" }}>
              {fmt(value)}
            </div>
          </div>
        ))}
      </div>

      {/* Chips situation */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{
          background: filtSit === "TOUS" ? "#1e293b" : "#f1f5f9",
          borderRadius: 8, padding: "5px 13px", fontSize: 12, fontWeight: 700,
          color: filtSit === "TOUS" ? "#fff" : "#475569",
          border: `1px solid ${filtSit === "TOUS" ? "#1e293b" : "#e2e8f0"}`,
          cursor: "pointer",
        }} onClick={() => setFiltSit("TOUS")}>
          Tout : {filtered.length}
        </div>
        {Object.entries(SIT).map(([k, s]) => (
          <div key={k} style={{
            background: filtSit === k ? `${s.color}20` : "#f9fafb",
            borderRadius: 8, padding: "5px 13px", fontSize: 12, fontWeight: 700,
            color: s.color,
            border: `1px solid ${s.color}${filtSit === k ? "50" : "25"}`,
            cursor: "pointer",
          }} onClick={() => setFiltSit(k)}>
            {s.label} : {stats[k]}
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher client, titre…"
          style={{ flex: "1 1 160px", padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
        />
        <select value={filtTr}  onChange={e => setFiltTr(e.target.value)}  style={selStyle}>
          <option value="TOUS">Toutes tranches</option>
          {tranches.map(t => <option key={t} value={t}>Tranche {t}</option>)}
        </select>
        <select value={filtAnn} onChange={e => setFiltAnn(e.target.value)} style={selStyle}>
          <option value="TOUS">Toutes années</option>
          {annees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtCat} onChange={e => setFiltCat(e.target.value)} style={selStyle}>
          <option value="TOUS">Toutes catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>Aucun dossier trouvé</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {filtered.map(d => <DossierCard key={d.id} d={d} />)}
        </div>
      )}
    </div>
  );
}
