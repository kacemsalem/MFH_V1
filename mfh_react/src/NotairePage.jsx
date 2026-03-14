import { useState, useEffect } from "react";
import { Card, PageHeader, DataTable } from "./ui-kit";

const API_URL = "http://localhost:8000/api/notaires/";

const initialForm = { nom_prenom_not: "", tel_notaire: "", email_notaire: "", obs_notaire: "" };

const btnModifier  = { background:"transparent", color:"#2563eb", border:"1px solid #2563eb", borderRadius:6, padding:"2px 10px", fontSize:12, cursor:"pointer", fontWeight:600 };
const btnSupprimer = { background:"transparent", color:"#dc2626", border:"1px solid #dc2626", borderRadius:6, padding:"2px 10px", fontSize:12, cursor:"pointer", fontWeight:600 };

export default function NotairePage() {
  const [form, setForm]       = useState(initialForm);
  const [editId, setEditId]   = useState(null);
  const [mode, setMode]       = useState("list");
  const [items, setItems]     = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

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

  const columns = [
    { key: "nom_prenom_not", header: "Nom & Prénom" },
    { key: "tel_notaire",    header: "Téléphone" },
    { key: "email_notaire",  header: "Email" },
    { key: "obs_notaire",    header: "Observations" },
    { key: "_actions", header: "",
      render: (_, row) => (
        <span style={{ display:"flex", gap:6 }}>
          <button onClick={() => handleEdit(row)}      style={btnModifier}>Modifier</button>
          <button onClick={() => handleDelete(row.id)} style={btnSupprimer}>Supprimer</button>
        </span>
      )
    },
  ];

  return (
    <div>
      <div className="flex justify-center mb-8 gap-2">
        <button className={`px-5 py-2 rounded-l-lg bg-blue-600 text-white shadow font-semibold text-lg ${mode==="form"?"ring-2 ring-blue-400":"opacity-80"}`}
          onClick={() => { setForm(initialForm); setEditId(null); setMode("form"); }}>Saisie</button>
        <button className={`px-5 py-2 rounded-r-lg bg-green-600 text-white shadow font-semibold text-lg ${mode==="list"?"ring-2 ring-green-400":"opacity-80"}`}
          onClick={() => { setMode("list"); setRefresh(r => !r); }}>Liste</button>
      </div>
      {mode === "form" ? (
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
      ) : (
        <Card className="mt-2"><PageHeader title="Liste des Notaires" /><DataTable columns={columns} data={items} /></Card>
      )}
    </div>
  );
}
