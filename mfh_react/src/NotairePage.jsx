import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, PageHeader, DataTable } from "./ui-kit";
import { useAuth } from "./AuthContext";

const API_URL = "/api/notaires/";

const initialForm = { nom_prenom_not: "", tel_notaire: "", email_notaire: "", obs_notaire: "" };

const btnModifier   = { background:"transparent", color:"#2563eb", border:"1px solid #2563eb", borderRadius:6, padding:"2px 10px", fontSize:12, cursor:"pointer", fontWeight:600 };
const btnSupprimer  = { background:"transparent", color:"#dc2626", border:"1px solid #dc2626", borderRadius:6, padding:"2px 10px", fontSize:12, cursor:"pointer", fontWeight:600 };
const btnHistorique = { background:"transparent", color:"#7c3aed", border:"1px solid #7c3aed", borderRadius:6, padding:"2px 10px", fontSize:12, cursor:"pointer", fontWeight:600 };

const fmtDate = v => v ? v.split("-").reverse().join("/") : "—";
const fmt     = v => Number(v || 0).toLocaleString("fr-FR");

const SIT = {
  RESERVATION: { label: "Réservation", bg: "#fef3c7", color: "#92400e" },
  VENTE:       { label: "Vente",       bg: "#d1fae5", color: "#065f46" },
  DESISTEMENT: { label: "Désistement", bg: "#fee2e2", color: "#991b1b" },
};

function SitBadge({ value }) {
  const s = SIT[value] || { label: value, bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 9999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

// ── Vue historique d'un notaire ───────────────────────────────────────────────
function NotaireHisto({ data, onBack }) {
  const { notaire, dossiers } = data;
  const navigate = useNavigate();

  const colsDossiers = [
    { key: "lot", header: "Lot",
      render: (_, r) => <span style={{ fontWeight: 600 }}>{r.n_titre || r.lot}</span> },
    { key: "client",     header: "Client" },
    { key: "commercial", header: "Commercial" },
    { key: "situation",  header: "Situation", render: v => <SitBadge value={v} /> },
    { key: "date_reservation", header: "Réservation", render: v => fmtDate(v) },
    { key: "date_vente",       header: "Acte vente",  render: v => fmtDate(v) },
    { key: "prix_vente", header: "Prix (DH)",
      render: v => v
        ? <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#059669" }}>{fmt(v)}</span>
        : "—" },
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

  const nVentes = dossiers.filter(d => d.situation === "VENTE").length;

  return (
    <div>
      <button onClick={onBack} style={{
        background: "transparent", border: "1px solid #e2e8f0", borderRadius: 8,
        padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#374151",
        fontWeight: 600, marginBottom: 20,
      }}>← Retour</button>

      {/* Carte infos notaire */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: "16px 20px",
        border: "1px solid #e5e7eb", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "linear-gradient(135deg,#0891b2,#67e8f9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 20,
        }}>
          {notaire.nom_prenom_not[0]}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1e3a5f" }}>{notaire.nom_prenom_not}</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2, display: "flex", gap: 16 }}>
            {notaire.tel_notaire   && <span>📞 {notaire.tel_notaire}</span>}
            {notaire.email_notaire && <span>✉️ {notaire.email_notaire}</span>}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#2563eb" }}>{dossiers.length}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Dossiers</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>{nVentes}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Actes vente</div>
          </div>
        </div>
      </div>

      {/* Tableau dossiers */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
          Dossiers pris en charge
        </div>
        {dossiers.length === 0
          ? <p style={{ color: "#9ca3af", fontSize: 13 }}>Aucun dossier pour ce notaire.</p>
          : <DataTable columns={colsDossiers} data={dossiers} />
        }
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function NotairePage() {
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
    if (!window.confirm("Supprimer ce notaire ?")) return;
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
    { key: "nom_prenom_not", header: "Nom & Prénom" },
    { key: "tel_notaire",    header: "Téléphone" },
    { key: "email_notaire",  header: "Email" },
    { key: "obs_notaire",    header: "Observations" },
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
          <PageHeader title={editId ? "Modifier le Notaire" : "Saisie Notaire"} />
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Nom & Prénom
              <input name="nom_prenom_not" value={form.nom_prenom_not} onChange={handleChange} className="border p-2 rounded font-normal" required />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Téléphone
              <input name="tel_notaire" value={form.tel_notaire} onChange={handleChange} className="border p-2 rounded font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Email
              <input name="email_notaire" value={form.email_notaire} onChange={handleChange} className="border p-2 rounded font-normal" type="email" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Observations
              <textarea name="obs_notaire" value={form.obs_notaire} onChange={handleChange} className="border p-2 rounded font-normal" />
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
          <PageHeader title="Liste des Notaires" />
          <DataTable columns={columns} data={items} />
        </Card>
      )}

      {mode === "historique" && (
        histoLoading
          ? <p style={{ color: "#9ca3af", padding: 40, textAlign: "center" }}>Chargement…</p>
          : histoData
            ? <NotaireHisto data={histoData} onBack={() => setMode("list")} />
            : <p style={{ color: "#dc2626" }}>Erreur de chargement.</p>
      )}
    </div>
  );
}
