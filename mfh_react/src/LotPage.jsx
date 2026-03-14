
import { useState, useEffect } from "react";
import { Card, PageHeader, DataTable } from "./ui-kit";

const API_URL = "http://localhost:8000/api/lots/";

const initialForm = {
  ilot: 0, lot: 0, tranche: "", n_titre: "", categorie: "",
  designation: "", surface: 0, prix_reference: 0, situation: "LIBRE", obs_lot: ""
};

const SIT_COLORS = {
  LIBRE:   { bg: "#16a34a", text: "#fff" },
  RESERVE: { bg: "#2563eb", text: "#fff" },
  VENDU:   { bg: "#dc2626", text: "#fff" },
};

const TRANCHE_COLORS = [
  "#2563eb", "#7c3aed", "#0891b2", "#059669", "#d97706",
  "#dc2626", "#db2777", "#65a30d", "#9333ea", "#0284c7",
];

function KebabMenu({ onEdit, onDelete }) {
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
            <button onClick={() => { setOpen(false); onEdit(); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "8px 14px", fontSize: 13, background: "none",
              border: "none", cursor: "pointer", color: "#2563eb", fontWeight: 600,
            }}>✏️ Modifier</button>
            <button onClick={() => { setOpen(false); onDelete(); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "8px 14px", fontSize: 13, background: "none",
              border: "none", cursor: "pointer", color: "#dc2626", fontWeight: 600,
              borderTop: "1px solid #f1f5f9",
            }}>🗑️ Supprimer</button>
          </div>
        </>
      )}
    </div>
  );
}

function LotKanban({ lots, onEdit, onDelete }) {
  const [filtreTranche, setFiltreTranche] = useState(null);
  const [filtreSit,     setFiltreSit]     = useState(null);

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
  const tranches = filtreTranche ? allTranches.filter(t => t === filtreTranche) : allTranches;

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
      {/* Filtres */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        {/* Filtre tranche */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Tranche</span>
          {pill("Toutes", filtreTranche === null, () => setFiltreTranche(null), "#1e293b")}
          {allTranches.map((t, ti) =>
            pill(`Tr. ${t}`, filtreTranche === t,
              () => setFiltreTranche(filtreTranche === t ? null : t),
              TRANCHE_COLORS[ti % TRANCHE_COLORS.length], t)
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

      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "8px 4px 16px" }}>
      {tranches.map((tranche) => {
        const color   = TRANCHE_COLORS[allTranches.indexOf(tranche) % TRANCHE_COLORS.length];
        const col     = tranchesMap[tranche];
        const visible = filtreSit ? col.filter(l => l.situation === filtreSit) : col;
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
                        <KebabMenu onEdit={() => onEdit(lot)} onDelete={() => onDelete(lot.id)} />
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
  const [form, setForm]     = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [mode, setMode]     = useState("kanban");
  const [lots, setLots]     = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [listSort,   setListSort]   = useState({ key: "tranche", dir: 1 });
  const [listFiltre, setListFiltre] = useState({ sit: "", cat: "", tranche: "" });

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
      .then(res => res.json())
      .then(data => setLots(data))
      .catch(() => setLots([]));
  }, [refresh]);


  return (
    <div>
      <div style={{ display:"flex", justifyContent:"center", marginBottom:28, gap:0 }}>
        {[
          { key:"form",   label:"Saisie",  color:"#2563eb" },
          { key:"list",   label:"Liste",   color:"#0891b2" },
          { key:"kanban", label:"Kanban",  color:"#059669" },
        ].map(({ key, label, color }, i, arr) => (
          <button key={key}
            onClick={() => {
              if (key==="form") { setForm(initialForm); setEditId(null); }
              setMode(key);
              if (key!=="form") setRefresh(r=>!r);
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
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            {/* Ligne 1 : N° Titre | Situation */}
            <label className="sm:col-span-2 flex flex-col gap-1 text-sm font-medium text-gray-600">N° Titre
              <input name="n_titre" value={form.n_titre} onChange={handleChange} className="border p-2 rounded font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Situation
              <select name="situation" value={form.situation} onChange={handleChange} className="border p-2 rounded font-normal">
                <option value="LIBRE">LIBRE</option>
                <option value="RESERVE">RESERVE</option>
                <option value="VENDU">VENDU</option>
              </select>
            </label>
            {/* Ligne 2 : Tranche | Ilot | Lot */}
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Tranche
              <input name="tranche" value={form.tranche} onChange={handleChange} className="border p-2 rounded font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Ilot
              <input name="ilot" value={form.ilot} onChange={handleChange} className="border p-2 rounded font-normal" type="number" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Lot
              <input name="lot" value={form.lot} onChange={handleChange} className="border p-2 rounded font-normal" type="number" />
            </label>
            {/* Ligne 3 : Catégorie | Surface | Prix de référence */}
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Catégorie
              <input name="categorie" value={form.categorie} onChange={handleChange} className="border p-2 rounded font-normal" />
            </label>
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
            {editId && (
              <button type="button" onClick={handleCancel}
                className="sm:col-span-3 bg-gray-400 text-white px-6 py-2 rounded shadow w-full font-semibold text-lg">
                Annuler
              </button>
            )}
          </form>
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
                  {rows.map((row, idx) => {
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
                          <KebabMenu onEdit={() => handleEdit(row)} onDelete={() => handleDelete(row.id)} />
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
      })() : (
        <div className="mt-2">
          <PageHeader title="Lots par Tranche" />
          <LotKanban lots={lots} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      )}
    </div>
  );
}
