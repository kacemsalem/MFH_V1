import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, PageHeader, DataTable } from "./ui-kit";
import { useAuth } from "./AuthContext";

const API_URL = "/api/commerciaux/";

const initialForm = { nom_prenom: "", tel_comm: "", email_comm: "", obs_comm: "" };

const btnModifier  = { background:"transparent", color:"#2563eb", border:"1px solid #2563eb", borderRadius:6, padding:"2px 10px", fontSize:12, cursor:"pointer", fontWeight:600 };
const btnSupprimer = { background:"transparent", color:"#dc2626", border:"1px solid #dc2626", borderRadius:6, padding:"2px 10px", fontSize:12, cursor:"pointer", fontWeight:600 };
const btnHistorique = { background:"transparent", color:"#7c3aed", border:"1px solid #7c3aed", borderRadius:6, padding:"2px 10px", fontSize:12, cursor:"pointer", fontWeight:600 };

const fmtDate = v => v ? v.split("-").reverse().join("/") : "—";
const fmt     = v => Number(v || 0).toLocaleString("fr-FR");

function daysDiff(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d     = new Date(dateStr); d.setHours(0, 0, 0, 0);
  const diff  = Math.round((today - d) / 86400000);
  if (diff === 0) return { label: "aujourd'hui", color: "#059669" };
  if (diff > 0)  return { label: `il y a ${diff} j`, color: diff > 30 ? "#dc2626" : "#d97706" };
  return { label: `dans ${-diff} j`, color: "#2563eb" };
}

const SIT = {
  RESERVATION: { label: "Réservation", bg: "#fef3c7", color: "#92400e" },
  VENTE:       { label: "Vente",       bg: "#d1fae5", color: "#065f46" },
  DESISTEMENT: { label: "Désistement", bg: "#fee2e2", color: "#991b1b" },
};

const EV_OPT = {
  OPTION_ACTIVE:  { label: "Option activée",  color: "#d97706", bg: "#fffbeb" },
  OPTION_ANNULEE: { label: "Option annulée",  color: "#dc2626", bg: "#fef2f2" },
};

function SitBadge({ value }) {
  const s = SIT[value] || { label: value, bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 9999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

// ── Vue historique d'un commercial ───────────────────────────────────────────
function CommercialHisto({ data, onBack }) {
  const [tab, setTab] = useState("dossiers"); // "options" | "dossiers"
  const { commercial, options, dossiers } = data;
  const navigate = useNavigate();

  const tabStyle = (t) => ({
    padding: "7px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
    border: "none", borderRadius: "8px 8px 0 0", marginRight: 2,
    background: tab === t ? "#fff" : "#e2e8f0",
    color: tab === t ? "#2563eb" : "#6b7280",
    borderBottom: tab === t ? "2px solid #2563eb" : "2px solid transparent",
  });

  const colsDossiers = [
    { key: "lot", header: "Lot",
      render: (_, r) => <span style={{ fontWeight: 600 }}>{r.n_titre || r.lot}</span> },
    { key: "client",  header: "Client" },
    { key: "notaire", header: "Notaire" },
    { key: "situation", header: "Situation", render: v => <SitBadge value={v} /> },
    { key: "date_reservation", header: "Réservation", render: v => fmtDate(v) },
    { key: "date_vente",       header: "Vente",        render: v => fmtDate(v) },
    { key: "prix_vente", header: "Prix (DH)",
      render: v => v ? <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#059669" }}>{fmt(v)}</span> : "—" },
    { key: "actif", header: "Statut",
      render: v => <span style={{ fontSize: 11, fontWeight: 700, color: v ? "#059669" : "#dc2626" }}>{v ? "Actif" : "Clôturé"}</span> },
    { key: "_open", header: "",
      render: (_, r) => (
        <button onClick={() => navigate("/dossiers", { state: { dossierId: r.id } })} style={{
          background: "#2563eb", color: "#fff", border: "none",
          borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>
          Ouvrir
        </button>
      )},
  ];

  return (
    <div>
      <button onClick={onBack} style={{
        background: "transparent", border: "1px solid #e2e8f0", borderRadius: 8,
        padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#374151",
        fontWeight: 600, marginBottom: 20,
      }}>← Retour</button>

      {/* Carte infos commercial */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: "16px 20px",
        border: "1px solid #e5e7eb", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 20,
        }}>
          {commercial.nom_prenom[0]}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1e3a5f" }}>{commercial.nom_prenom}</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2, display: "flex", gap: 16 }}>
            {commercial.tel_comm   && <span>📞 {commercial.tel_comm}</span>}
            {commercial.email_comm && <span>✉️ {commercial.email_comm}</span>}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#2563eb" }}>{dossiers.length}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Dossiers</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#d97706" }}>{options.length}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Options</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>
              {dossiers.filter(d => d.situation === "VENTE").length}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Ventes</div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ borderBottom: "2px solid #e5e7eb", marginBottom: 0 }}>
        <button style={tabStyle("dossiers")} onClick={() => setTab("dossiers")}>
          Dossiers ({dossiers.length})
        </button>
        <button style={tabStyle("options")} onClick={() => setTab("options")}>
          Options ({options.length})
        </button>
      </div>

      <div style={{ background: "#fff", borderRadius: "0 0 12px 12px", border: "1px solid #e5e7eb", borderTop: "none", padding: "16px" }}>
        {tab === "dossiers" && (
          dossiers.length === 0
            ? <p style={{ color: "#9ca3af", fontSize: 13 }}>Aucun dossier pour ce commercial.</p>
            : <DataTable columns={colsDossiers} data={dossiers} />
        )}

        {tab === "options" && (
          options.length === 0
            ? <p style={{ color: "#9ca3af", fontSize: 13 }}>Aucune option enregistrée.</p>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {options.map((o, i) => {
                  const cfg = EV_OPT[o.type] || { label: o.type, color: "#6b7280", bg: "#f3f4f6" };
                  return (
                    <div key={i} style={{
                      background: cfg.bg, border: `1px solid ${cfg.color}30`,
                      borderLeft: `3px solid ${cfg.color}`, borderRadius: 8, padding: "10px 14px",
                      display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
                    }}>
                      <span style={{ background: cfg.color, color: "#fff", borderRadius: 20, padding: "2px 12px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                        {cfg.label}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>{fmtDate(o.date)}</span>
                      {(() => { const dd = daysDiff(o.date); return dd
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: dd.color, background: `${dd.color}15`, borderRadius: 20, padding: "2px 10px" }}>{dd.label}</span>
                        : null; })()}
                      <span style={{ fontSize: 13, color: "#475569" }}>
                        {o.n_titre ? `N° ${o.n_titre} · ` : ""}{o.lot}
                      </span>
                    </div>
                  );
                })}
              </div>
            )
        )}
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function CommercialPage() {
  const { role } = useAuth(); const canEdit = role === "ADMIN";
  const [form, setForm]       = useState(initialForm);
  const [editId, setEditId]   = useState(null);
  const [mode, setMode]       = useState("list");
  const [items, setItems]     = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => { if (mode === "form" && !canEdit) setMode("list"); }, [canEdit, mode]);

  // Historique
  const [histoData,    setHistoData]    = useState(null);
  const [histoLoading, setHistoLoading] = useState(false);

  useEffect(() => {
    fetch(API_URL).then(r => r.json()).then(d => setItems(d)).catch(() => setItems([]));
  }, [refresh]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleEdit = (row) => {
    const { id, ...fields } = row;
    setForm(fields); setEditId(id); setMode("form"); setError("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce commercial ?")) return;
    await fetch(`${API_URL}${id}/`, { method: "DELETE" });
    setRefresh(r => !r);
  };

  const handleCancel = () => { setForm(initialForm); setEditId(null); setMode("list"); };

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch(editId ? `${API_URL}${editId}/` : API_URL, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(JSON.stringify(d)); }
      setForm(initialForm); setEditId(null); setMode("list"); setRefresh(r => !r);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const openHistorique = async (row) => {
    setHistoLoading(true); setMode("historique");
    const data = await fetch(`${API_URL}${row.id}/historique/`)
      .then(r => r.json()).catch(() => null);
    setHistoData(data);
    setHistoLoading(false);
  };

  const columns = [
    { key: "nom_prenom", header: "Nom & Prénom" },
    { key: "tel_comm",   header: "Téléphone" },
    { key: "email_comm", header: "Email" },
    { key: "obs_comm",   header: "Observations" },
    { key: "_actions", header: "",
      render: (_, row) => (
        <span style={{ display:"flex", gap:6 }}>
          <button onClick={() => openHistorique(row)} style={btnHistorique}>Historique</button>
          {canEdit && <button onClick={() => handleEdit(row)}      style={btnModifier}>Modifier</button>}
          {canEdit && <button onClick={() => handleDelete(row.id)} style={btnSupprimer}>Supprimer</button>}
        </span>
      )
    },
  ];

  return (
    <div>
      {/* Barre de navigation (masquée en mode historique) */}
      {mode !== "historique" && (
        <div className="flex justify-center mb-8 gap-2">
          {canEdit && (
            <button className={`px-5 py-2 rounded-l-lg bg-blue-600 text-white shadow font-semibold text-lg ${mode==="form"?"ring-2 ring-blue-400":"opacity-80"}`}
              onClick={() => { setForm(initialForm); setEditId(null); setMode("form"); }}>Saisie</button>
          )}
          <button className={`px-5 py-2 rounded-r-lg bg-green-600 text-white shadow font-semibold text-lg ${mode==="list"?"ring-2 ring-green-400":"opacity-80"}`}
            onClick={() => { setMode("list"); setRefresh(r => !r); }}>Liste</button>
        </div>
      )}

      {mode === "form" && (
        <Card className="max-w-xl mx-auto mt-2">
          <PageHeader title={editId ? "Modifier le Commercial" : "Saisie Commercial"} />
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Nom & Prénom
              <input name="nom_prenom" value={form.nom_prenom} onChange={handleChange} className="border p-2 rounded font-normal" required />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Téléphone
              <input name="tel_comm" value={form.tel_comm} onChange={handleChange} className="border p-2 rounded font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Email
              <input name="email_comm" value={form.email_comm} onChange={handleChange} className="border p-2 rounded font-normal" type="email" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Observations
              <textarea name="obs_comm" value={form.obs_comm} onChange={handleChange} className="border p-2 rounded font-normal" />
            </label>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded shadow w-full font-semibold text-lg disabled:opacity-60">
              {loading ? "Enregistrement..." : editId ? "Mettre à jour" : "Enregistrer"}
            </button>
            {editId && <button type="button" onClick={handleCancel} className="bg-gray-400 text-white px-6 py-2 rounded shadow w-full font-semibold text-lg">Annuler</button>}
          </form>
        </Card>
      )}

      {mode === "list" && (
        <Card className="mt-2">
          <PageHeader title="Liste des Commerciaux" />
          <DataTable columns={columns} data={items} />
        </Card>
      )}

      {mode === "historique" && (
        histoLoading
          ? <p style={{ color: "#9ca3af", padding: 40, textAlign: "center" }}>Chargement…</p>
          : histoData
            ? <CommercialHisto data={histoData} onBack={() => setMode("list")} />
            : <p style={{ color: "#dc2626" }}>Erreur de chargement.</p>
      )}
    </div>
  );
}
