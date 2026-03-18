
import { useState, useEffect } from "react";
import { Card, PageHeader, DataTable } from "./ui-kit";
import { useAuth } from "./AuthContext";

const API_URL = "/api/lots/";

const initialForm = {
  ilot: 0, lot: 0, tranche: "", n_titre: "", categorie: "",
  designation: "", surface: 0, prix_reference: 0, situation: "LIBRE", obs_lot: ""
};

const SIT_COLORS = {
  LIBRE:   { bg: "#16a34a", text: "#fff" },
  OPTION:  { bg: "#d97706", text: "#fff" },
  RESERVE: { bg: "#2563eb", text: "#fff" },
  VENDU:   { bg: "#dc2626", text: "#fff" },
};

const EV_CFG = {
  OPTION_ACTIVE:  { label: "Option activée",   color: "#d97706", bg: "#fffbeb", icon: "🟡" },
  OPTION_ANNULEE: { label: "Option annulée",   color: "#dc2626", bg: "#fef2f2", icon: "❌" },
  RESERVATION:    { label: "Réservation",      color: "#2563eb", bg: "#eff6ff", icon: "📋" },
  VENTE:          { label: "Vente",            color: "#059669", bg: "#f0fdf4", icon: "✅" },
  DESISTEMENT:    { label: "Désistement",      color: "#dc2626", bg: "#fef2f2", icon: "↩️" },
};

const fmtDate = v => v ? v.split("-").reverse().join("/") : "—";
const fmt     = v => Number(v || 0).toLocaleString("fr-FR");

function HistoTimeline({ events }) {
  if (!events.length)
    return <p style={{ color: "#9ca3af", fontSize: 13, padding: "20px 0" }}>Aucun événement enregistré.</p>;
  return (
    <div style={{ position: "relative", paddingLeft: 28 }}>
      {/* Ligne verticale */}
      <div style={{ position: "absolute", left: 9, top: 4, bottom: 4, width: 2, background: "#e2e8f0" }} />
      {events.map((ev, i) => {
        const cfg = EV_CFG[ev.type] || { label: ev.type, color: "#6b7280", bg: "#f3f4f6", icon: "•" };
        return (
          <div key={i} style={{ position: "relative", marginBottom: 18 }}>
            {/* Pastille */}
            <div style={{
              position: "absolute", left: -28, top: 6, width: 18, height: 18,
              borderRadius: "50%", background: cfg.color, display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 800,
            }}>
              {i + 1}
            </div>
            {/* Carte événement */}
            <div style={{
              background: cfg.bg, border: `1px solid ${cfg.color}30`,
              borderLeft: `3px solid ${cfg.color}`, borderRadius: 8,
              padding: "10px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: cfg.color, borderRadius: 20, padding: "1px 10px" }}>
                  {cfg.icon} {cfg.label}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{fmtDate(ev.date)}</span>
              </div>
              <div style={{ fontSize: 12, color: "#475569", display: "flex", flexWrap: "wrap", gap: "2px 20px" }}>
                {ev.client     && <span>👤 <b>{ev.client}</b></span>}
                {ev.commercial && <span>💼 {ev.commercial}</span>}
                {ev.notaire    && <span>⚖️ {ev.notaire}</span>}
                {ev.prix_vente && <span>💰 {fmt(ev.prix_vente)} DH</span>}
              </div>
              {ev.obs && (
                <div style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic", marginTop: 4, paddingTop: 4, borderTop: "1px solid #e2e8f040" }}>
                  📝 {ev.obs}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const TRANCHE_COLOR = "#64748b"; // gris ardoise uniforme

function KebabMenu({ onEdit, onDelete, onHistorique, canEdit }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 18, color: "#94a3b8", padding: "0 4px", lineHeight: 1,
          borderRadius: 4,
        }}
        title="Actions"
      >⋮</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
          <div style={{
            position: "absolute", right: 0, top: "100%", zIndex: 20,
            background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            minWidth: 130, overflow: "hidden",
          }}>
            {canEdit && <button onClick={() => { setOpen(false); onEdit(); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "8px 14px", fontSize: 13, background: "none",
              border: "none", cursor: "pointer", color: "#2563eb", fontWeight: 600,
            }}>✏️ Modifier</button>}
            <button onClick={() => { setOpen(false); onHistorique(); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "8px 14px", fontSize: 13, background: "none",
              border: "none", cursor: "pointer", color: "#7c3aed", fontWeight: 600,
              borderTop: canEdit ? "1px solid #f1f5f9" : "none",
            }}>📋 Historique</button>
            {canEdit && <button onClick={() => { setOpen(false); onDelete(); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "8px 14px", fontSize: 13, background: "none",
              border: "none", cursor: "pointer", color: "#dc2626", fontWeight: 600,
              borderTop: "1px solid #f1f5f9",
            }}>🗑️ Supprimer</button>}
          </div>
        </>
      )}
    </div>
  );
}

// ── Composant select + bouton [+] pour ajouter une valeur ────────────────────
function SelectWithAdd({ label, name, value, onChange, options, colSpan }) {
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");

  const confirm = () => {
    const v = newVal.trim();
    if (v) { onChange({ target: { name, value: v } }); }
    setAdding(false); setNewVal("");
  };

  return (
    <label className={`${colSpan || ""} flex flex-col gap-1 text-sm font-medium text-gray-600`}>
      {label}
      <div style={{ display: "flex", gap: 5 }}>
        <select name={name} value={value} onChange={onChange}
          className="border p-2 rounded font-normal"
          style={{ flex: 1 }}>
          <option value="">— Choisir —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
          {value && !options.includes(value) && <option value={value}>{value}</option>}
        </select>
        <button type="button" onClick={() => { setAdding(a => !a); setNewVal(""); }}
          style={{
            background: "#2563eb", color: "#fff", border: "none",
            borderRadius: 6, padding: "0 11px", fontSize: 18,
            cursor: "pointer", fontWeight: 700, lineHeight: 1,
          }}>+</button>
      </div>
      {adding && (
        <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
          <input autoFocus value={newVal} onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); confirm(); } }}
            placeholder={`Nouvelle valeur…`}
            style={{ flex: 1, border: "1px solid #93c5fd", padding: "4px 8px", borderRadius: 6, fontSize: 13 }} />
          <button type="button" onClick={confirm}
            style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, padding: "0 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>OK</button>
          <button type="button" onClick={() => { setAdding(false); setNewVal(""); }}
            style={{ background: "#9ca3af", color: "#fff", border: "none", borderRadius: 6, padding: "0 8px", fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>
      )}
    </label>
  );
}

const KANBAN_LOTS_PER_PAGE = 40;

function LotKanban({ lots, onEdit, onDelete, onHistorique, canEdit }) {
  const [filtreTranche, setFiltreTranche] = useState(null);
  const [filtreSit,     setFiltreSit]     = useState(null);
  const [kanbanPage,    setKanbanPage]    = useState(1);

  if (!Array.isArray(lots)) return null;

  // Grouper par tranche (tri naturel)
  const tranchesMap = {};
  lots.forEach(lot => {
    const t = lot.tranche || "—";
    if (!tranchesMap[t]) tranchesMap[t] = [];
    tranchesMap[t].push(lot);
  });
  const allTranches = Object.keys(tranchesMap).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );

  // Lots visibles après filtres, dans l'ordre tranche→ilot→lot
  const visibleLots = lots
    .filter(l => (!filtreTranche || l.tranche === filtreTranche) && (!filtreSit || l.situation === filtreSit))
    .sort((a, b) => {
      const tc = String(a.tranche || "").localeCompare(String(b.tranche || ""), undefined, { numeric: true });
      if (tc !== 0) return tc;
      const ic = Number(a.ilot) - Number(b.ilot);
      return ic !== 0 ? ic : Number(a.lot) - Number(b.lot);
    });

  // Pagination sur les lots visibles
  const kbTotalPages = Math.max(1, Math.ceil(visibleLots.length / KANBAN_LOTS_PER_PAGE));
  const kbSafePage   = Math.min(kanbanPage, kbTotalPages);
  const pageLots     = visibleLots.slice((kbSafePage - 1) * KANBAN_LOTS_PER_PAGE, kbSafePage * KANBAN_LOTS_PER_PAGE);

  // Re-grouper les lots de la page par tranche
  const pageMap = {};
  pageLots.forEach(l => {
    const t = l.tranche || "—";
    if (!pageMap[t]) pageMap[t] = [];
    pageMap[t].push(l);
  });
  const tranches = Object.keys(pageMap).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (lots.length === 0) {
    return <p style={{ color: "#6b7280", textAlign: "center", marginTop: 40 }}>Aucun lot enregistré.</p>;
  }

  const pill = (label, active, onClick, color) => (
    <button onClick={onClick} style={{
      padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      cursor: "pointer", border: "none",
      background: active ? color : "#e2e8f0",
      color: active ? "#fff" : "#475569",
    }}>{label}</button>
  );

  return (
    <div>
      {/* Filtres + pagination */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        {/* Filtre tranche */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Tranche</span>
          {pill("Toutes", filtreTranche === null, () => { setFiltreTranche(null); setKanbanPage(1); }, "#1e293b")}
          {allTranches.map((t) =>
            pill(`Tr. ${t}`, filtreTranche === t,
              () => { setFiltreTranche(filtreTranche === t ? null : t); setKanbanPage(1); },
              TRANCHE_COLOR)
          )}
        </div>
        <div style={{ width: 1, height: 22, background: "#e2e8f0" }} />
        {/* Filtre situation */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Situation</span>
          {pill("Tout", filtreSit === null,    () => setFiltreSit(null),       "#1e293b")}
          {pill("Libre",   filtreSit==="LIBRE",   () => setFiltreSit(filtreSit==="LIBRE"   ? null : "LIBRE"),   SIT_COLORS.LIBRE.bg)}
          {pill("Réservé", filtreSit==="RESERVE", () => setFiltreSit(filtreSit==="RESERVE" ? null : "RESERVE"), SIT_COLORS.RESERVE.bg)}
          {pill("Vendu",   filtreSit==="VENDU",   () => setFiltreSit(filtreSit==="VENDU"   ? null : "VENDU"),   SIT_COLORS.VENDU.bg)}
        </div>
      </div>

      {/* Pagination centrée */}
      {kbTotalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <button disabled={kbSafePage <= 1} onClick={() => setKanbanPage(p => p - 1)}
            style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #e2e8f0", background: kbSafePage <= 1 ? "#f8fafc" : "#fff", cursor: kbSafePage <= 1 ? "default" : "pointer", fontSize: 16, color: "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ‹
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#374151", minWidth: 80, textAlign: "center" }}>
            {kbSafePage} / {kbTotalPages}
          </span>
          <button disabled={kbSafePage >= kbTotalPages} onClick={() => setKanbanPage(p => p + 1)}
            style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #e2e8f0", background: kbSafePage >= kbTotalPages ? "#f8fafc" : "#fff", cursor: kbSafePage >= kbTotalPages ? "default" : "pointer", fontSize: 16, color: "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ›
          </button>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>{visibleLots.length} lots</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "8px 4px 16px" }}>
      {tranches.map((tranche) => {
        const color   = TRANCHE_COLOR;
        const col     = tranchesMap[tranche] || [];
        const visible = pageMap[tranche] || [];
        const libre   = col.filter(l => l.situation === "LIBRE").length;
        const reserve = col.filter(l => l.situation === "RESERVE").length;
        const vendu   = col.filter(l => l.situation === "VENDU").length;
        if (visible.length === 0) return null;
        return (
          <div key={tranche}>
            {/* En-tête ligne */}
            <div style={{
              background: color, color: "#fff",
              borderRadius: "10px 10px 0 0",
              padding: "8px 16px",
              display: "flex", alignItems: "center", gap: 20,
            }}>
              <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.5, minWidth: 110 }}>
                Tranche {tranche}
              </span>
              <span style={{ fontSize: 11, opacity: 0.9, display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>{col.length} lots</span>
                <span>·</span>
                <span>🟢 {libre}</span>
                <span>🔵 {reserve}</span>
                <span>🔴 {vendu}</span>
              </span>
            </div>

            {/* Cartes en ligne (max 5 par ligne) */}
            <div style={{
              background: "#f1f5f9",
              borderRadius: "0 0 10px 10px",
              padding: "10px 10px 12px",
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(180px, 1fr))",
              gap: 10,
            }}>
              {visible.map(lot => {
                const sit = SIT_COLORS[lot.situation] || { bg: "#e5e7eb", text: "#374151" };
                return (
                  <div key={lot.id} style={{
                    background: "#fff",
                    borderRadius: 8,
                    padding: "10px 12px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    borderLeft: `4px solid ${sit.bg}`,
                  }}>
                    {/* Ligne 1 : titre + badge + menu */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#1e293b" }}>
                        {lot.n_titre || `Îlot ${lot.ilot} – Lot ${lot.lot}`}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{
                          background: sit.bg, color: sit.text,
                          fontSize: 9, fontWeight: 700, padding: "1px 6px",
                          borderRadius: 10, letterSpacing: 0.5, whiteSpace: "nowrap",
                        }}>
                          {lot.situation}
                        </span>
                        <KebabMenu onEdit={() => onEdit(lot)} onDelete={() => onDelete(lot.id)} onHistorique={() => onHistorique(lot)} canEdit={canEdit} />
                      </div>
                    </div>

                    {/* Ligne 2 : Îlot/Lot si titre différent */}
                    {lot.n_titre && (
                      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                        Îlot {lot.ilot} – Lot {lot.lot}
                      </div>
                    )}

                    {/* Infos */}
                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
                      {lot.categorie && <div><span style={{ color: "#94a3b8" }}>Cat. :</span> {lot.categorie}</div>}
                      {lot.surface > 0 && <div><span style={{ color: "#94a3b8" }}>Surface :</span> {lot.surface} m²</div>}
                      {lot.designation && (
                        <div style={{ fontStyle: "italic", color: "#64748b", marginTop: 2, fontSize: 11 }}>{lot.designation}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

export default function LotPage() {
  const { role } = useAuth(); const canEdit = role === "ADMIN";
  const [form, setForm]     = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [mode, setMode]     = useState("kanban");

  useEffect(() => { if (mode === "form" && !canEdit) setMode("kanban"); }, [canEdit, mode]);
  const [lots, setLots]     = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [listSort,   setListSort]   = useState({ key: "tranche", dir: 1 });
  const [listFiltre, setListFiltre] = useState({ sit: "", cat: "", tranche: "" });

  // Pagination liste
  const [listPage, setListPage] = useState(1);
  const LIST_PAGE_SIZE = 20;

  // Historique lot
  const [histoLot,    setHistoLot]    = useState(null);   // { lot, events }
  const [histoLoading, setHistoLoading] = useState(false);

  const [prevMode, setPrevMode] = useState("kanban");

  const openHistorique = async (lot) => {
    setPrevMode(mode);
    setHistoLoading(true); setMode("historique");
    const data = await fetch(`/api/lots/${lot.id}/historique-complet/`)
      .then(r => { if (!r.ok) return null; return r.json(); }).catch(() => null);
    setHistoLot(data);
    setHistoLoading(false);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleEdit = (row) => {
    const { id, ...fields } = row;
    setForm(fields);
    setEditId(id);
    setMode("form");
    setError("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce lot ?")) return;
    await fetch(`${API_URL}${id}/`, { method: "DELETE" });
    setRefresh(r => !r);
  };

  const handleCancel = () => {
    setForm(initialForm);
    setEditId(null);
    setError("");
    setMode("kanban");
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url    = editId ? `${API_URL}${editId}/` : API_URL;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(JSON.stringify(data));
      }
      setForm(initialForm);
      setEditId(null);
      setMode("kanban");
      setRefresh(r => !r);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => setLots(Array.isArray(data) ? data : []))
      .catch(() => setLots([]));
  }, [refresh]);

  useEffect(() => { setListPage(1); }, [listFiltre]);


  return (
    <div>
      <div style={{ display:"flex", justifyContent:"center", marginBottom:28, gap:0 }}>
        {[
          ...(canEdit ? [{ key:"form", label:"Saisie", color:"#2563eb" }] : []),
          { key:"list",   label:"Liste",   color:"#0891b2" },
          { key:"kanban", label:"Kanban",  color:"#059669" },
        ].map(({ key, label, color }, i, arr) => (
          <button key={key}
            onClick={() => {
              if (key==="form") { setForm(initialForm); setEditId(null); }
              setMode(key);
            }}
            style={{
              padding:"8px 22px", fontSize:14, fontWeight:700, cursor:"pointer",
              background: mode===key ? color : "#f1f5f9",
              color: mode===key ? "#fff" : "#475569",
              border:"1px solid #e2e8f0",
              borderRadius: i===0 ? "8px 0 0 8px" : i===arr.length-1 ? "0 8px 8px 0" : 0,
              borderLeft: i>0 ? "none" : "1px solid #e2e8f0",
              transition:"background 0.15s",
            }}
          >{label}</button>
        ))}
      </div>

      {mode === "form" ? (
        <Card className="max-w-2xl mx-auto mt-2">
          <PageHeader title={editId ? "Modifier le Lot" : "Saisie Lot"} />
          {(() => {
            const uniqTranches = [...new Set(lots.map(l => l.tranche || "").filter(Boolean))].sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
            const uniqCats     = [...new Set(lots.map(l => l.categorie || "").filter(Boolean))].sort();
            return (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            {/* Ligne 1 : N° Titre | Situation */}
            <label className="sm:col-span-2 flex flex-col gap-1 text-sm font-medium text-gray-600">N° Titre
              <input name="n_titre" value={form.n_titre} onChange={handleChange} className="border p-2 rounded font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Situation
              {editId ? (
                <select name="situation" value={form.situation} onChange={handleChange} className="border p-2 rounded font-normal">
                  <option value="LIBRE">LIBRE</option>
                  <option value="RESERVE">RÉSERVÉ</option>
                  <option value="VENDU">VENDU</option>
                  <option value="OPTION">OPTION</option>
                </select>
              ) : (
                <input value="LIBRE" readOnly className="border p-2 rounded font-normal bg-gray-50 text-gray-400 cursor-not-allowed" />
              )}
            </label>
            {/* Ligne 2 : Tranche | Ilot | Lot */}
            <SelectWithAdd label="Tranche" name="tranche" value={form.tranche} onChange={handleChange} options={uniqTranches} />
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Ilot
              <input name="ilot" value={form.ilot} onChange={handleChange} className="border p-2 rounded font-normal" type="number" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Lot
              <input name="lot" value={form.lot} onChange={handleChange} className="border p-2 rounded font-normal" type="number" />
            </label>
            {/* Ligne 3 : Catégorie | Surface | Prix de référence */}
            <SelectWithAdd label="Catégorie" name="categorie" value={form.categorie} onChange={handleChange} options={uniqCats} />
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Surface
              <input name="surface" value={form.surface} onChange={handleChange} className="border p-2 rounded font-normal" type="number" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Prix de référence
              <input name="prix_reference" value={form.prix_reference} onChange={handleChange} className="border p-2 rounded font-normal" type="number" />
            </label>
            {/* Ligne 4 : Désignation */}
            <label className="sm:col-span-3 flex flex-col gap-1 text-sm font-medium text-gray-600">Désignation
              <input name="designation" value={form.designation} onChange={handleChange} className="border p-2 rounded font-normal" />
            </label>
            {/* Ligne 6 : Observations */}
            <label className="sm:col-span-3 flex flex-col gap-1 text-sm font-medium text-gray-600">Observations
              <textarea name="obs_lot" value={form.obs_lot} onChange={handleChange} className="border p-2 rounded font-normal" />
            </label>
            {error && <p className="sm:col-span-3 text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="sm:col-span-3 bg-blue-600 text-white px-6 py-2 rounded shadow w-full font-semibold text-lg mt-2 disabled:opacity-60">
              {loading ? "Enregistrement..." : editId ? "Mettre à jour" : "Enregistrer"}
            </button>
            <button type="button" onClick={handleCancel}
              className="sm:col-span-3 bg-gray-400 text-white px-6 py-2 rounded shadow w-full font-semibold text-lg">
              Annuler
            </button>
          </form>
            );
          })()}
        </Card>
      ) : mode === "list" ? (() => {
        // Valeurs uniques pour les filtres
        const uniqTranches = [...new Set(lots.map(l => l.tranche || ""))].filter(Boolean)
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        const uniqCats = [...new Set(lots.map(l => l.categorie || ""))].filter(Boolean).sort();

        // Appliquer filtres
        let rows = lots.filter(l =>
          (!listFiltre.sit     || l.situation === listFiltre.sit) &&
          (!listFiltre.cat     || l.categorie  === listFiltre.cat) &&
          (!listFiltre.tranche || l.tranche    === listFiltre.tranche)
        );

        // Appliquer tri
        const numCols = ["ilot", "lot", "surface", "prix_reference"];
        rows = rows.slice().sort((a, b) => {
          const va = a[listSort.key] ?? "";
          const vb = b[listSort.key] ?? "";
          if (numCols.includes(listSort.key)) return listSort.dir * (Number(va) - Number(vb));
          return listSort.dir * String(va).localeCompare(String(vb), undefined, { numeric: true });
        });

        const toggleSort = (key) => setListSort(s =>
          s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }
        );
        const sortIcon = (key) => listSort.key === key ? (listSort.dir === 1 ? " ▲" : " ▼") : " ⇅";

        const selStyle = { border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", fontSize: 13, color: "#374151", background: "#fff", cursor: "pointer" };
        const thStyle  = (key) => ({
          padding: "9px 10px", textAlign: "left", fontSize: 12, fontWeight: 700,
          color: listSort.key === key ? "#2563eb" : "#6b7280",
          cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
          borderBottom: "2px solid #e5e7eb",
          background: "#f8fafc",
        });

        const totalPages = Math.max(1, Math.ceil(rows.length / LIST_PAGE_SIZE));
        const safePage   = Math.min(listPage, totalPages);
        const pageRows   = rows.slice((safePage - 1) * LIST_PAGE_SIZE, safePage * LIST_PAGE_SIZE);

        const PaginationBar = () => totalPages <= 1 ? null : (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, margin: "10px 0" }}>
            <button disabled={safePage <= 1} onClick={() => setListPage(p => p - 1)}
              style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #e2e8f0", background: safePage <= 1 ? "#f8fafc" : "#fff", cursor: safePage <= 1 ? "default" : "pointer", fontSize: 16, color: "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}>
              ‹
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#374151", minWidth: 80, textAlign: "center" }}>
              {safePage} / {totalPages}
            </span>
            <button disabled={safePage >= totalPages} onClick={() => setListPage(p => p + 1)}
              style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #e2e8f0", background: safePage >= totalPages ? "#f8fafc" : "#fff", cursor: safePage >= totalPages ? "default" : "pointer", fontSize: 16, color: "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}>
              ›
            </button>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{rows.length} lots</span>
          </div>
        );

        return (
          <div className="mt-2">
            <PageHeader title={`Liste des Lots (${rows.length})`} />

            {/* Barre de filtres */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
              <select style={selStyle} value={listFiltre.tranche}
                onChange={e => setListFiltre(f => ({ ...f, tranche: e.target.value }))}>
                <option value="">Toutes tranches</option>
                {uniqTranches.map(t => <option key={t} value={t}>Tranche {t}</option>)}
              </select>
              <select style={selStyle} value={listFiltre.cat}
                onChange={e => setListFiltre(f => ({ ...f, cat: e.target.value }))}>
                <option value="">Toutes catégories</option>
                {uniqCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select style={selStyle} value={listFiltre.sit}
                onChange={e => setListFiltre(f => ({ ...f, sit: e.target.value }))}>
                <option value="">Toutes situations</option>
                <option value="LIBRE">LIBRE</option>
                <option value="RESERVE">RÉSERVÉ</option>
                <option value="VENDU">VENDU</option>
              </select>
              {(listFiltre.sit || listFiltre.cat || listFiltre.tranche) && (
                <button onClick={() => setListFiltre({ sit: "", cat: "", tranche: "" })}
                  style={{ ...selStyle, color: "#dc2626", borderColor: "#fca5a5" }}>
                  ✕ Effacer
                </button>
              )}
            </div>

            <PaginationBar />

            {/* Table triable */}
            <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}>
              <table style={{ minWidth: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {[
                      { key: "tranche",       label: "Tranche" },
                      { key: "n_titre",        label: "N° Titre" },
                      { key: "ilot",           label: "Îlot" },
                      { key: "lot",            label: "Lot" },
                      { key: "categorie",      label: "Catégorie" },
                      { key: "surface",        label: "Surface (m²)" },
                      { key: "prix_reference", label: "Prix réf." },
                      { key: "designation",    label: "Désignation" },
                      { key: "situation",      label: "Situation" },
                    ].map(col => (
                      <th key={col.key} style={thStyle(col.key)} onClick={() => toggleSort(col.key)}>
                        {col.label}{sortIcon(col.key)}
                      </th>
                    ))}
                    <th style={{ ...thStyle("_"), cursor: "default", color: "#6b7280" }} />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, idx) => {
                    const sit = SIT_COLORS[row.situation] || { bg: "#e5e7eb", text: "#374151" };
                    return (
                      <tr key={row.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#f8fafc"}>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9" }}>{row.tranche}</td>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9", fontWeight: 600 }}>{row.n_titre}</td>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>{row.ilot}</td>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>{row.lot}</td>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9" }}>{row.categorie}</td>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>{row.surface}</td>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>{row.prix_reference?.toLocaleString("fr-FR")}</td>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9", color: "#64748b", fontStyle: "italic", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.designation}</td>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9" }}>
                          <span style={{ background: sit.bg, color: sit.text, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, letterSpacing: 0.5 }}>
                            {row.situation}
                          </span>
                        </td>
                        <td style={{ padding: "7px 6px", borderBottom: "1px solid #f1f5f9" }}>
                          <KebabMenu onEdit={() => handleEdit(row)} onDelete={() => handleDelete(row.id)} onHistorique={() => openHistorique(row)} canEdit={canEdit} />
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr><td colSpan={10} style={{ textAlign: "center", padding: 32, color: "#9ca3af" }}>Aucun lot correspondant aux filtres.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })() : mode === "historique" ? null : (
        <div className="mt-2">
          <PageHeader title="Lots par Tranche" />
          <LotKanban lots={lots} onEdit={handleEdit} onDelete={handleDelete} onHistorique={openHistorique} canEdit={canEdit} />
        </div>
      )}

      {/* ── Mode historique ── */}
      {mode === "historique" && (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <button onClick={() => setMode(prevMode)} style={{
            background: "transparent", border: "1px solid #e2e8f0", borderRadius: 8,
            padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#374151",
            fontWeight: 600, marginBottom: 20,
          }}>← Retour</button>

          {histoLoading && <p style={{ color: "#9ca3af" }}>Chargement…</p>}
          {!histoLoading && !histoLot && <p style={{ color: "#dc2626", fontSize: 13 }}>Impossible de charger l'historique.</p>}

          {!histoLoading && histoLot && (() => {
            const { lot, events } = histoLot;
            const sit = SIT_COLORS[lot.situation] || { bg: "#6b7280", text: "#fff" };
            return (
              <>
                {/* En-tête lot */}
                <div style={{
                  background: "#fff", borderRadius: 12, padding: "16px 20px",
                  border: "1px solid #e5e7eb", marginBottom: 20,
                  display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#1e3a5f" }}>
                      {lot.n_titre ? `N° Titre : ${lot.n_titre}` : `Îlot ${lot.ilot} – Lot ${lot.lot}`}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
                      {lot.n_titre && `Îlot ${lot.ilot} – Lot ${lot.lot} · `}
                      Tranche <b>{lot.tranche || "—"}</b>
                      {lot.surface > 0 && <> · <b>{lot.surface}</b> m²</>}
                      {lot.categorie && <> · {lot.categorie}</>}
                    </div>
                  </div>
                  <span style={{ background: sit.bg, color: sit.text, borderRadius: 20, padding: "4px 16px", fontWeight: 700, fontSize: 13 }}>
                    {lot.situation}
                  </span>
                </div>

                {/* Timeline */}
                <div style={{
                  background: "#fff", borderRadius: 12, padding: "20px 24px",
                  border: "1px solid #e5e7eb",
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
                    Timeline — {events.length} événement{events.length !== 1 ? "s" : ""}
                  </div>
                  <HistoTimeline events={events} />
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
