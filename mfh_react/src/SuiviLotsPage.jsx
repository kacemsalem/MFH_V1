import { useEffect, useState, useMemo } from "react";

const SIT = {
  LIBRE:   { label: "Libre",    color: "#16a34a", bg: "#f0fdf4" },
  RESERVE: { label: "Réservé",  color: "#d97706", bg: "#fffbeb" },
  VENDU:   { label: "Vendu",    color: "#2563eb", bg: "#eff6ff" },
  OPTION:  { label: "Option",   color: "#7c3aed", bg: "#faf5ff" },
};

const fmt     = v => Number(v || 0).toLocaleString("fr-FR");
const daysSince = dateStr => {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
};

function LotCard({ lot, dossByLot }) {
  const sit     = SIT[lot.situation] || { label: lot.situation, color: "#6b7280", bg: "#f9fafb" };
  const dossier = dossByLot[lot.id];
  const isVente = (lot.situation === "VENDU" || lot.situation === "RESERVE") && dossier?.prix_vente;
  const prixVal = isVente ? Number(dossier.prix_vente) : Number(lot.prix_reference || 0);
  const prixTag = isVente ? "Pr. vente" : "Pr. réf";
  const pm2     = lot.surface > 0 && prixVal > 0 ? Math.round(prixVal / lot.surface) : 0;

  return (
    <div style={{
      background: sit.bg, borderRadius: 10, padding: "10px 12px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
      borderLeft: `3px solid ${sit.color}`,
    }}>
      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{
          background: `${sit.color}15`, color: sit.color,
          border: `1px solid ${sit.color}35`,
          fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 7px", letterSpacing: 0.4,
        }}>{sit.label}</span>
        {lot.categorie && (
          <span style={{
            fontSize: 10, color: "#64748b",
            background: "#f1f5f9", border: "1px solid #e2e8f0",
            borderRadius: 4, padding: "2px 6px",
          }}>{lot.categorie}</span>
        )}
      </div>

      {/* Référence lot */}
      <div style={{ fontWeight: 700, fontSize: 13, color: "#1e3a8a", marginBottom: 1 }}>
        TR{lot.tranche} · Îlot {lot.ilot} · Lot {lot.lot}
      </div>
      {lot.n_titre && (
        <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 600, marginBottom: 5 }}>[{lot.n_titre}]</div>
      )}

      {/* Prix + surface sur une ligne */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3, marginTop: 5 }}>
        <div style={{ fontSize: 12 }}>
          <span style={{ color: "#6b7280", fontSize: 11 }}>{prixTag} </span>
          <b style={{ color: "#1e3a8a", fontFamily: "monospace" }}>{fmt(prixVal)}</b>
        </div>
        {lot.surface > 0 && (
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            {lot.surface} m²{pm2 > 0 ? ` · ${fmt(pm2)}/m²` : ""}
          </div>
        )}
      </div>

      {/* Commercial / Client / Option */}
      {(lot.commercial_option_display || dossier?.client_display) && (
        <div style={{ fontSize: 11, color: "#475569", borderTop: "1px solid #e2e8f0", paddingTop: 5, marginTop: 4 }}>
          {lot.situation === "OPTION" && lot.commercial_option_display && (() => {
            const jours = daysSince(lot.date_option);
            const alerte = jours !== null && jours > 7;
            return (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#7c3aed" }}>◎ {lot.commercial_option_display}</span>
                {jours !== null && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 5,
                    background: alerte ? "#fef2f2" : "#faf5ff",
                    color: alerte ? "#dc2626" : "#7c3aed",
                    border: `1px solid ${alerte ? "#dc262630" : "#7c3aed30"}`,
                  }}>
                    {jours}j
                  </span>
                )}
              </div>
            );
          })()}
          {lot.situation !== "OPTION" && lot.commercial_option_display && (
            <div style={{ color: "#7c3aed" }}>◎ {lot.commercial_option_display}</div>
          )}
          {dossier?.client_display && <div>👤 {dossier.client_display}</div>}
        </div>
      )}
    </div>
  );
}

export default function SuiviLotsPage() {
  const [lots,      setLots]      = useState([]);
  const [dossByLot, setDossByLot] = useState({});
  const [loading,   setLoading]   = useState(true);
  const [filtSit,   setFiltSit]   = useState("TOUS");
  const [filtCat,   setFiltCat]   = useState("TOUS");
  const [filtTr,    setFiltTr]    = useState("TOUS");
  const [filtAnn,   setFiltAnn]   = useState("TOUS");
  const [search,    setSearch]    = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/bootstrap/").then(r => r.ok ? r.json() : {}),
      fetch("/api/dossiers/").then(r => r.ok ? r.json() : []),
    ]).then(([bootstrap, dosData]) => {
      setLots(bootstrap.lots || []);
      const list = Array.isArray(dosData) ? dosData : (dosData.results || []);
      const map  = {};
      list.filter(d => d.actif).forEach(d => { map[d.lot] = d; });
      setDossByLot(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const tranches = useMemo(() => [...new Set(lots.map(l => l.tranche).filter(Boolean))].sort(), [lots]);
  const categories = useMemo(() => [...new Set(lots.map(l => l.categorie).filter(Boolean))].sort(), [lots]);

  const annees = useMemo(() => {
    const s = new Set();
    Object.values(dossByLot).forEach(d => {
      const dt = d.date_vente || d.date_reservation;
      if (dt) s.add(dt.slice(0, 4));
    });
    return [...s].sort().reverse();
  }, [dossByLot]);

  const filtered = useMemo(() => lots.filter(l => {
    if (filtSit !== "TOUS" && l.situation !== filtSit) return false;
    if (filtCat !== "TOUS" && l.categorie !== filtCat) return false;
    if (filtTr  !== "TOUS" && String(l.tranche) !== filtTr) return false;
    if (filtAnn !== "TOUS") {
      const d  = dossByLot[l.id];
      const dt = d?.date_vente || d?.date_reservation;
      if (!dt || dt.slice(0, 4) !== filtAnn) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!(l.n_titre     || "").toLowerCase().includes(q) &&
          !String(l.ilot  || "").includes(q) &&
          !String(l.lot   || "").includes(q) &&
          !(l.categorie   || "").toLowerCase().includes(q)) return false;
    }
    return true;
  }), [lots, filtSit, filtCat, filtTr, filtAnn, search, dossByLot]);

  // Compteurs par situation
  const counts = useMemo(() => {
    const c = { LIBRE: 0, RESERVE: 0, VENDU: 0, OPTION: 0 };
    filtered.forEach(l => { if (c[l.situation] !== undefined) c[l.situation]++; });
    return c;
  }, [filtered]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Chargement…</div>;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>

      {/* Compteurs / filtres situation */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{
          background: filtSit === "TOUS" ? "#1e293b" : "#f1f5f9",
          borderRadius: 8, padding: "5px 13px",
          fontSize: 12, fontWeight: 700,
          color: filtSit === "TOUS" ? "#fff" : "#475569",
          border: `1px solid ${filtSit === "TOUS" ? "#1e293b" : "#e2e8f0"}`,
          cursor: "pointer",
        }} onClick={() => setFiltSit("TOUS")}>
          Tout : {filtered.length}
        </div>
        {Object.entries(SIT).map(([k, s]) => (
          <div key={k} style={{
            background: filtSit === k ? `${s.color}20` : "#f9fafb",
            borderRadius: 8, padding: "5px 13px",
            fontSize: 12, fontWeight: 700, color: s.color,
            border: `1px solid ${s.color}${filtSit === k ? "50" : "25"}`,
            cursor: "pointer",
          }} onClick={() => setFiltSit(k)}>
            {s.label} : {counts[k]}
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher titre, ilot, lot…"
          style={{ flex: "1 1 160px", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }} />

        <select value={filtTr} onChange={e => setFiltTr(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}>
          <option value="TOUS">Toutes tranches</option>
          {tranches.map(t => <option key={t} value={t}>Tranche {t}</option>)}
        </select>

        <select value={filtCat} onChange={e => setFiltCat(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}>
          <option value="TOUS">Toutes catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={filtAnn} onChange={e => setFiltAnn(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}>
          <option value="TOUS">Toutes années</option>
          {annees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>Aucun lot trouvé</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 14 }}>
          {filtered.map(l => <LotCard key={l.id} lot={l} dossByLot={dossByLot} />)}
        </div>
      )}
    </div>
  );
}
