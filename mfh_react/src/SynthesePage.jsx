import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

/* ── Formatters ── */
const fmtM   = (n) => n >= 1_000_000
  ? `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`
  : `${Math.round(n || 0).toLocaleString("fr-FR")}`;
const fmtDH  = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} DH`;
const fmtNum = (n) => Math.round(n || 0).toLocaleString("fr-FR");

/* ── KPI card ── */
function KpiCard({ label, value, icon, color, sub }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "18px 20px",
      boxShadow: "0 1px 6px rgba(0,0,0,0.07)", flex: 1, minWidth: 155,
      borderTop: `4px solid ${color}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
            {label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", lineHeight: 1.1 }}>
            {fmtM(value)}
          </div>
          {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: color + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0, marginLeft: 8,
        }}>{icon}</div>
      </div>
    </div>
  );
}

/* ── Helper : données catégorie filtrées par année ── */
function buildCatForYear(annee, par_categorie, tableau) {
  if (!annee) return par_categorie;
  const rows = tableau.filter(r => r.annee === annee);
  const map  = {};
  for (const r of rows) {
    if (!map[r.categorie]) {
      map[r.categorie] = {
        categorie: r.categorie,
        vendu: 0, reserve: 0, disponible: 0,
        surface_vendu: 0, surface_reserve: 0, surface_disponible: 0, surface_total: 0,
        _pm2_sum: 0, _pm2_n: 0,
      };
    }
    map[r.categorie].vendu           += r.total_ventes;
    map[r.categorie].reserve         += r.total_reserves;
    map[r.categorie].surface_vendu   += r.surface_vendu   || 0;
    map[r.categorie].surface_reserve += r.surface_reserve || 0;
    map[r.categorie].surface_total   += r.surface;
    if (r.prix_m2 > 0) { map[r.categorie]._pm2_sum += r.prix_m2; map[r.categorie]._pm2_n += 1; }
  }
  return Object.values(map)
    .map(c => ({ ...c, prix_m2_moyen: c._pm2_n > 0 ? Math.round(c._pm2_sum / c._pm2_n) : 0 }))
    .sort((a, b) => (b.vendu + b.reserve) - (a.vendu + a.reserve));
}

/* ── Sélecteur année (dropdown) ── */
function YearSelect({ annees, value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      fontSize: 12, padding: "4px 10px", borderRadius: 6,
      border: "1px solid #e2e8f0", color: value ? "#1e40af" : "#64748b",
      background: "#fff", cursor: "pointer", fontWeight: 600,
      outline: "none",
    }}>
      <option value="">Toutes</option>
      {annees.map(a => <option key={a} value={a}>{a}</option>)}
    </select>
  );
}

/* ── Filtre années — pills pour graphe évolution ── */
function YearPills({ annees, annee, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <button onClick={() => onChange("")} style={{
        padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
        cursor: "pointer", border: "none",
        background: annee === "" ? "#1e293b" : "#e2e8f0",
        color: annee === "" ? "#fff" : "#475569",
      }}>Toutes</button>
      {annees.map(a => (
        <button key={a} onClick={() => onChange(a === annee ? "" : a)} style={{
          padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
          cursor: "pointer", border: "none",
          background: annee === a ? "#2563eb" : "#e2e8f0",
          color: annee === a ? "#fff" : "#475569",
        }}>{a}</button>
      ))}
    </div>
  );
}

/* ── Tooltips ── */
const TT = ({ children }) => (
  <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
    {children}
  </div>
);

const TooltipLine = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <TT>
      <div style={{ fontWeight: 700, color: "#374151", marginBottom: 6 }}>{label}</div>
      {payload.map(p => <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>{p.name} : {fmtDH(p.value)}</div>)}
    </TT>
  );
};

const DONUT_LABELS = { DISPONIBLE: "Disponible", RESERVE: "Réservé", VENDU: "Vendu" };
const DONUT_COLORS = { DISPONIBLE: "#16a34a", RESERVE: "#2563eb", VENDU: "#64748b" };

const TooltipDonut = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return <TT><span style={{ fontWeight: 700 }}>{DONUT_LABELS[name] || name}</span> : {value} lots</TT>;
};

const TooltipValeur = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <TT>
      <div style={{ fontWeight: 700, color: "#374151", marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name} : {(p.value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M DH
        </div>
      ))}
    </TT>
  );
};

const TooltipSurf = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <TT>
      <div style={{ fontWeight: 700, color: "#374151", marginBottom: 6 }}>{label}</div>
      {payload.map(p => <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>{p.name} : {fmtNum(p.value)} m²</div>)}
    </TT>
  );
};

const TooltipPM2 = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <TT>
      <div style={{ fontWeight: 700, color: "#374151", marginBottom: 4 }}>{label}</div>
      <div style={{ color: payload[0].color }}>Prix/m² : {fmtNum(payload[0].value)} DH/m²</div>
    </TT>
  );
};

/* ── Tableau détaillé ── */
const TH = ({ children, right }) => (
  <th style={{
    position: "sticky", top: 0, zIndex: 2,
    padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#475569",
    textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap",
    textAlign: right ? "right" : "left",
    background: "#f1f5f9", borderBottom: "2px solid #e2e8f0",
    boxShadow: "0 1px 0 #e2e8f0",
  }}>{children}</th>
);

const TD = ({ children, right, bold, color }) => (
  <td style={{
    padding: "8px 12px", fontSize: 12.5, textAlign: right ? "right" : "left",
    fontWeight: bold ? 700 : 400, color: color || "#374151",
    borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap",
  }}>{children}</td>
);

function TableauDetail({ tableau }) {
  const [openYears, setOpenYears] = useState({});

  const byYear = useMemo(() => {
    const m = {};
    for (const r of tableau) {
      (m[r.annee] = m[r.annee] || []).push(r);
    }
    return m;
  }, [tableau]);

  const years = useMemo(() => Object.keys(byYear).sort().reverse(), [byYear]);

  useEffect(() => {
    setOpenYears(Object.fromEntries(years.map(y => [y, false])));
  }, [years.join(",")]);

  const toggle = (y) => setOpenYears(s => ({ ...s, [y]: !s[y] }));

  const nonVenduByCat = useMemo(() => {
    const m = {};
    for (const r of tableau) m[r.categorie] = r.valeur_non_vendu;
    return m;
  }, [tableau]);

  const grand = useMemo(() => tableau.reduce((acc, r) => ({
    ventes:   acc.ventes   + r.total_ventes,
    reserves: acc.reserves + r.total_reserves,
    encaisse: acc.encaisse + r.total_encaisse,
    reste:    acc.reste    + r.reste_a_recevoir,
    surf:     acc.surf     + r.surface,
    nv:       0,
    nb:       acc.nb       + r.nb_ventes + r.nb_reserves,
  }), { ventes: 0, reserves: 0, encaisse: 0, reste: 0, surf: 0, nv: 0, nb: 0 }), [tableau]);

  const grandNV   = Object.values(nonVenduByCat).reduce((s, v) => s + v, 0);
  const grandPM2  = grand.surf > 0 ? Math.round((grand.ventes + grand.reserves) / grand.surf) : 0;

  const pill = (label, bg, color) => (
    <span style={{ background: bg, color, fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "2px 7px", marginRight: 3 }}>
      {label}
    </span>
  );

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Tableau détaillé — Ventes &amp; Réservations</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
          Prix vente = dossier · Stock non vendu = prix référence lot · Cliquer sur une année pour réduire/étendre
        </div>
      </div>

      <div style={{ maxHeight: 520, overflowY: "auto", overflowX: "auto", borderRadius: 8, border: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
          <thead>
            <tr>
              <TH>Catégorie</TH>
              <TH right>Ventes (DH)</TH>
              <TH right>Réservés (DH)</TH>
              <TH right>Encaissé (DH)</TH>
              <TH right>Reste à recevoir</TH>
              <TH right>Prix/m²</TH>
              <TH right>Stock non vendu</TH>
            </tr>
          </thead>
          <tbody>
            {years.map(year => {
              const rows = byYear[year];
              const open = openYears[year] !== false;

              const sub = rows.reduce((acc, r) => ({
                ventes:   acc.ventes   + r.total_ventes,
                reserves: acc.reserves + r.total_reserves,
                encaisse: acc.encaisse + r.total_encaisse,
                reste:    acc.reste    + r.reste_a_recevoir,
                surf:     acc.surf     + r.surface,
                nb:       acc.nb       + r.nb_ventes + r.nb_reserves,
              }), { ventes: 0, reserves: 0, encaisse: 0, reste: 0, surf: 0, nb: 0 });
              const subPM2 = sub.surf > 0 ? Math.round((sub.ventes + sub.reserves) / sub.surf) : 0;
              const subNV  = [...new Set(rows.map(r => r.categorie))].reduce((s, c) => s + (nonVenduByCat[c] || 0), 0);

              return [
                /* ── Ligne titre année ── */
                <tr key={`yr-${year}`} onClick={() => toggle(year)}
                  style={{ cursor: "pointer", background: "#1e3a8a", userSelect: "none" }}>
                  <td colSpan={7} style={{ padding: "9px 14px", color: "#fff", fontWeight: 700, fontSize: 13 }}>
                    <span style={{ marginRight: 10, fontSize: 11, opacity: 0.7 }}>{open ? "▼" : "▶"}</span>
                    {year}
                    <span style={{ marginLeft: 14, fontSize: 11, fontWeight: 400, opacity: 0.75 }}>
                      {sub.nb} opération{sub.nb > 1 ? "s" : ""}
                      {" · "}ventes {fmtM(sub.ventes)}
                      {sub.reserves > 0 ? ` · réservés ${fmtM(sub.reserves)}` : ""}
                    </span>
                  </td>
                </tr>,

                /* ── Lignes catégorie ── */
                ...(!open ? [] : rows.map((r, i) => (
                  <tr key={`${year}-${r.categorie}-${i}`}
                    style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <TD>
                      <div style={{ fontWeight: 600 }}>{r.categorie}</div>
                      <div style={{ marginTop: 3 }}>
                        {r.nb_ventes   > 0 && pill(`${r.nb_ventes} v.`,   "#dcfce7", "#15803d")}
                        {r.nb_reserves > 0 && pill(`${r.nb_reserves} r.`, "#dbeafe", "#1d4ed8")}
                        {r.surface > 0 && <span style={{ fontSize: 10, color: "#94a3b8" }}>{fmtNum(r.surface)} m²</span>}
                      </div>
                    </TD>
                    <TD right>{r.total_ventes   > 0 ? fmtNum(r.total_ventes)   : "—"}</TD>
                    <TD right>{r.total_reserves > 0 ? fmtNum(r.total_reserves) : "—"}</TD>
                    <TD right color="#0891b2">{r.total_encaisse > 0 ? fmtNum(r.total_encaisse) : "—"}</TD>
                    <TD right bold={r.reste_a_recevoir > 0} color={r.reste_a_recevoir > 0 ? "#d97706" : "#16a34a"}>
                      {r.reste_a_recevoir > 0 ? fmtNum(r.reste_a_recevoir) : "✓"}
                    </TD>
                    <TD right color="#7c3aed">{r.prix_m2 > 0 ? `${fmtNum(r.prix_m2)} DH/m²` : "—"}</TD>
                    <TD right color="#64748b">{r.valeur_non_vendu > 0 ? fmtM(r.valeur_non_vendu) : "—"}</TD>
                  </tr>
                ))),

                /* ── Sous-total année ── */
                <tr key={`sub-${year}`} style={{ background: "#eff6ff", borderTop: "2px solid #bfdbfe" }}>
                  <TD bold color="#1e40af">
                    Sous-total {year}
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{fmtNum(sub.surf)} m²</div>
                  </TD>
                  <TD right bold color="#1e40af">{sub.ventes   > 0 ? fmtM(sub.ventes)   : "—"}</TD>
                  <TD right bold color="#1e40af">{sub.reserves > 0 ? fmtM(sub.reserves) : "—"}</TD>
                  <TD right bold color="#0891b2">{sub.encaisse > 0 ? fmtM(sub.encaisse) : "—"}</TD>
                  <TD right bold color={sub.reste > 0 ? "#d97706" : "#16a34a"}>
                    {sub.reste > 0 ? fmtM(sub.reste) : "✓ Soldé"}
                  </TD>
                  <TD right bold color="#7c3aed">{subPM2 > 0 ? `${fmtNum(subPM2)} DH/m²` : "—"}</TD>
                  <TD right bold color="#64748b">{subNV > 0 ? fmtM(subNV) : "—"}</TD>
                </tr>,
              ];
            })}

            {/* ── Grand total ── */}
            {tableau.length > 0 && (
              <tr style={{ background: "#1e293b" }}>
                <TD bold color="#fff">
                  Grand total
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{grand.nb} opérations · {fmtNum(grand.surf)} m²</div>
                </TD>
                <TD right bold color="#86efac">{fmtM(grand.ventes)}</TD>
                <TD right bold color="#93c5fd">{fmtM(grand.reserves)}</TD>
                <TD right bold color="#67e8f9">{fmtM(grand.encaisse)}</TD>
                <TD right bold color={grand.reste > 0 ? "#fcd34d" : "#86efac"}>
                  {grand.reste > 0 ? fmtM(grand.reste) : "✓ Soldé"}
                </TD>
                <TD right bold color="#c4b5fd">{grandPM2 > 0 ? `${fmtNum(grandPM2)} DH/m²` : "—"}</TD>
                <TD right bold color="#cbd5e1">{fmtM(grandNV)}</TD>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
export default function SynthesePage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [annee,        setAnnee]        = useState(""); // évolution
  const [anneeValeur,  setAnneeValeur]  = useState(""); // valeur par catégorie
  const [anneeMetrage, setAnneeMetrage] = useState(""); // consommation métrage
  const [anneePM2,     setAnneePM2]     = useState(""); // prix/m²

  useEffect(() => {
    fetch("/api/synthese/")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setData(d))
      .catch(() => setError("Impossible de charger les données."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: "#9ca3af" }}>Chargement…</div>;
  if (error)   return <div style={{ color: "#dc2626", padding: 40 }}>{error}</div>;
  if (!data)   return null;

  const { kpi, lots_status, evolution, par_categorie, tableau } = data;

  /* ── Années disponibles ── */
  const allMonths = [...new Set([
    ...evolution.ventes.map(v => v.mois),
    ...evolution.encaissements.map(e => e.mois),
  ])].sort();
  const annees = [...new Set([
    ...allMonths.map(m => m.slice(0, 4)),
    ...tableau.map(r => r.annee),
  ])].sort();

  /* ── Données catégorie par graphe (calcul indépendant) ── */
  const catValeur  = buildCatForYear(anneeValeur,  par_categorie, tableau);
  const catMetrage = buildCatForYear(anneeMetrage, par_categorie, tableau);
  const catPM2     = buildCatForYear(anneePM2,     par_categorie, tableau);

  /* ── Évolution (filtrée par année) ── */
  const venteMap  = Object.fromEntries(evolution.ventes.map(v => [v.mois, v.montant]));
  const encaisMap = Object.fromEntries(evolution.encaissements.map(e => [e.mois, e.montant]));
  const monthsFiltered = annee ? allMonths.filter(m => m.startsWith(annee)) : allMonths;
  const chartEvol = monthsFiltered.map(m => {
    const [y, mo] = m.split("-");
    return {
      label:              annee ? mo : `${mo}/${y.slice(2)}`,
      "Valeur vendue":    venteMap[m]  || 0,
      "Montant encaissé": encaisMap[m] || 0,
    };
  });

  /* ── Donut (non filtré par année) ── */
  const donutData = Object.entries(lots_status).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  const totalLots = Object.values(lots_status).reduce((a, b) => a + b, 0);

  /* ── Barres valeur catégorie ── */
  const catData = catValeur.slice(0, 12).map(c => ({
    name: c.categorie.length > 14 ? c.categorie.slice(0, 13) + "…" : c.categorie,
    "Vendu":   Math.round(c.vendu   / 1e6 * 10) / 10,
    "Réservé": Math.round(c.reserve / 1e6 * 10) / 10,
    ...(!anneeValeur ? { "Disponible": Math.round(c.disponible / 1e6 * 10) / 10 } : {}),
  }));

  /* ── Surface ── */
  const surfData = catMetrage.filter(c =>
    (c.surface_vendu || 0) + (c.surface_reserve || 0) + (c.surface_disponible || 0) > 0
  ).slice(0, 12).map(c => ({
    name: c.categorie.length > 14 ? c.categorie.slice(0, 13) + "…" : c.categorie,
    "Vendu":   c.surface_vendu   || 0,
    "Réservé": c.surface_reserve || 0,
    ...(!anneeMetrage ? { "Disponible": c.surface_disponible || 0 } : {}),
  }));

  const pm2Data = catPM2.filter(c => c.prix_m2_moyen > 0).slice(0, 12).map(c => ({
    name: c.categorie.length > 14 ? c.categorie.slice(0, 13) + "…" : c.categorie,
    "Prix/m²": c.prix_m2_moyen,
  }));

  /* ── Métrages globaux ── */
  const surfTotale = par_categorie.reduce((s, c) => s + (c.surface_total || 0), 0);
  const surfVendue = par_categorie.reduce((s, c) => s + (c.surface_vendu || 0), 0);
  const pctSurf    = surfTotale > 0 ? ((surfVendue / surfTotale) * 100).toFixed(1) : "0.0";

  /* ── Progression ── */
  const progress = kpi.total_value > 0
    ? Math.min((kpi.value_sold + kpi.value_reserved) / kpi.total_value, 1) : 0;
  const pct = (progress * 100).toFixed(1);


  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Barre de progression ── */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Avancement commercial du projet</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>(Vendus + Réservés) / Valeur totale · prix réels</div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#1e293b" }}>{pct} %</div>
        </div>
        <div style={{ height: 13, background: "#f1f5f9", borderRadius: 20, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: "linear-gradient(90deg, #2563eb 0%, #16a34a 100%)",
            borderRadius: 20, transition: "width 0.8s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#94a3b8" }}>
          <span>{fmtM(kpi.value_sold)} vendus · {fmtM(kpi.value_reserved)} réservés</span>
          <span>Stock : {fmtM(kpi.value_non_vendu)} DH</span>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <KpiCard label="Valeur vendue"    value={kpi.value_sold}      icon="✅" color="#16a34a" sub={`${lots_status.VENDU} lots · prix vente`} />
        <KpiCard label="Valeur réservée"  value={kpi.value_reserved}  icon="🔵" color="#2563eb" sub={`${lots_status.RESERVE} lots · prix vente`} />
        <KpiCard label="Stock non vendu"  value={kpi.value_non_vendu} icon="🏗" color="#64748b" sub={`${lots_status.DISPONIBLE} lots · prix réf.`} />
        <KpiCard label="Montant encaissé" value={kpi.total_recu}      icon="💰" color="#0891b2"
          sub={`${((kpi.total_recu / ((kpi.value_sold + kpi.value_reserved) || 1)) * 100).toFixed(0)} % des contrats`} />
        <KpiCard
          label={kpi.restant >= 0 ? "Reste à recevoir" : "Excédent encaissé"}
          value={Math.abs(kpi.restant)} icon={kpi.restant >= 0 ? "⏳" : "⚠️"}
          color={kpi.restant >= 0 ? "#d97706" : "#dc2626"} sub="sur vendus + réservés" />
      </div>

      {/* ── Évolution + Donut ── */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", flex: 3, minWidth: 280 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Évolution des ventes et encaissements</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>en millions DH · prix vente réel</div>
            </div>
            {annees.length > 0 && <YearPills annees={annees} annee={annee} onChange={setAnnee} />}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartEvol} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }}
                interval={annee ? 0 : Math.floor(chartEvol.length / 8)}
                tickLine={false} axisLine={false} />
              <YAxis tickFormatter={v => `${v >= 1 ? v.toFixed(0) : v.toFixed(1)} M`}
                tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={52} />
              <Tooltip content={<TooltipLine />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Line type="monotone" dataKey="Valeur vendue"    stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="Montant encaissé" stroke="#16a34a" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 2 }}>Statut des lots</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>{totalLots} lots · options = disponibles</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={76}
                paddingAngle={3} dataKey="value" nameKey="name">
                {donutData.map(e => <Cell key={e.name} fill={DONUT_COLORS[e.name] || "#e2e8f0"} />)}
              </Pie>
              <Tooltip content={<TooltipDonut />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {donutData.map(({ name, value }) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: DONUT_COLORS[name], flexShrink: 0 }} />
                <span style={{ color: "#475569", flex: 1 }}>{DONUT_LABELS[name]}</span>
                <span style={{ fontWeight: 700, color: "#1e293b" }}>{value}</span>
                <span style={{ color: "#94a3b8", fontSize: 11 }}>{((value / totalLots) * 100).toFixed(0)} %</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Valeur par catégorie ── */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Valeur par catégorie de lot</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              en millions DH · {anneeValeur ? `${anneeValeur} — Vendu · Réservé` : "Vendu · Réservé · Disponible"}
            </div>
          </div>
          {annees.length > 0 && <YearSelect annees={annees} value={anneeValeur} onChange={setAnneeValeur} />}
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={catData} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }}
              angle={-30} textAnchor="end" interval={0} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={v => `${v} M`} tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false} axisLine={false} width={44} />
            <Tooltip content={<TooltipValeur />} />
            <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
            <Bar dataKey="Vendu"      stackId="a" fill="#64748b" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Réservé"    stackId="a" fill="#2563eb" radius={anneeValeur ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
            {!anneeValeur && <Bar dataKey="Disponible" stackId="a" fill="#16a34a" radius={[4, 4, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Surface + Prix/m² ── */}
      {surfData.length > 0 && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", flex: 3, minWidth: 280 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Consommation du métrage par catégorie</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  surface en m² · {anneeMetrage ? `${anneeMetrage} — Vendu · Réservé` : "Vendu · Réservé · Disponible"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {!anneeMetrage && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{pctSurf} %</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>
                      {fmtNum(surfVendue)} / {fmtNum(surfTotale)} m²
                    </div>
                  </div>
                )}
                {annees.length > 0 && <YearSelect annees={annees} value={anneeMetrage} onChange={setAnneeMetrage} />}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={surfData} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }}
                  angle={-30} textAnchor="end" interval={0} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={44} />
                <Tooltip content={<TooltipSurf />} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                <Bar dataKey="Vendu"      stackId="b" fill="#64748b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Réservé"    stackId="b" fill="#2563eb" radius={anneeMetrage ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                {!anneeMetrage && <Bar dataKey="Disponible" stackId="b" fill="#16a34a" radius={[4, 4, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {pm2Data.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", flex: 2, minWidth: 220 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Prix moyen au m²</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>DH/m² · {anneePM2 || "toutes années"}</div>
                </div>
                {annees.length > 0 && <YearSelect annees={annees} value={anneePM2} onChange={setAnneePM2} />}
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={pm2Data} layout="vertical" margin={{ top: 4, right: 50, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name"
                    tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip content={<TooltipPM2 />} />
                  <Bar dataKey="Prix/m²" fill="#7c3aed" radius={[0, 4, 4, 0]}>
                    {pm2Data.map((_, i) => (
                      <Cell key={i} fill={`hsl(${260 - i * 18}, 65%, ${55 + i * 3}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Tableau détaillé (en dernier) ── */}
      {tableau && tableau.length > 0 && <TableauDetail tableau={tableau} />}

    </div>
  );
}
