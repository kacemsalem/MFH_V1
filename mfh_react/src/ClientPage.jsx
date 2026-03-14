import { useState, useEffect } from "react";
import { FaUserPlus, FaListUl, FaUserTie, FaEnvelope, FaPhone, FaIdCard, FaBuilding, FaStickyNote } from "react-icons/fa";
import { Card, PageHeader, DataTable } from "./ui-kit";

const API_URL = "http://localhost:8000/api/clients/";

const initialForm = {
  nom_prenom_client: "", cin_client: "", tel_client: "",
  email_client: "", obs_client: "", statut_client: "AQUEREUR",
};

const btnModifier  = { background:"transparent", color:"#2563eb", border:"1px solid #2563eb", borderRadius:6, padding:"2px 10px", fontSize:12, cursor:"pointer", fontWeight:600 };
const btnSupprimer = { background:"transparent", color:"#dc2626", border:"1px solid #dc2626", borderRadius:6, padding:"2px 10px", fontSize:12, cursor:"pointer", fontWeight:600 };

function ClientForm({ editId, editData, onSuccess, onCancel }) {
  const [form, setForm]       = useState(editData || initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => { setForm(editData || initialForm); }, [editData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch(editId ? `${API_URL}${editId}/` : API_URL, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erreur lors de l'enregistrement");
      onSuccess && onSuccess();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <Card className="max-w-xl mx-auto mt-2">
      <PageHeader title={editId ? "Modifier le Client" : "Saisie Client"} />
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Nom & Prénom
          <input name="nom_prenom_client" value={form.nom_prenom_client} onChange={handleChange} className="border p-2 rounded font-normal" required />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">CIN
          <input name="cin_client" value={form.cin_client} onChange={handleChange} className="border p-2 rounded font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Téléphone
          <input name="tel_client" value={form.tel_client} onChange={handleChange} className="border p-2 rounded font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Email
          <input name="email_client" value={form.email_client} onChange={handleChange} className="border p-2 rounded font-normal" type="email" />
        </label>
        <label className="sm:col-span-2 flex flex-col gap-1 text-sm font-medium text-gray-600">Observations
          <textarea name="obs_client" value={form.obs_client} onChange={handleChange} className="border p-2 rounded font-normal" />
        </label>
        <label className="sm:col-span-2 flex flex-col gap-1 text-sm font-medium text-gray-600">Statut
          <select name="statut_client" value={form.statut_client} onChange={handleChange} className="border p-2 rounded font-normal">
            <option value="AQUEREUR">AQUEREUR</option>
            <option value="SOCIETE">SOCIETE</option>
          </select>
        </label>
        {error && <p className="sm:col-span-2 text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="sm:col-span-2 bg-blue-600 text-white px-6 py-2 rounded shadow w-full font-semibold text-lg disabled:opacity-60">
          {loading ? "Enregistrement..." : editId ? "Mettre à jour" : "Enregistrer le client"}
        </button>
        {editId && <button type="button" onClick={onCancel} className="sm:col-span-2 bg-gray-400 text-white px-6 py-2 rounded shadow w-full font-semibold text-lg">Annuler</button>}
      </form>
    </Card>
  );
}

export default function ClientPage() {
  const [mode, setMode]         = useState("list");
  const [items, setItems]       = useState([]);
  const [refresh, setRefresh]   = useState(false);
  const [editId, setEditId]     = useState(null);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    fetch(API_URL).then(r => r.json()).then(d => setItems(d)).catch(() => setItems([]));
  }, [refresh]);

  const handleEdit = (client) => {
    const { id, ...fields } = client;
    setEditId(id); setEditData(fields); setMode("form");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce client ?")) return;
    await fetch(`${API_URL}${id}/`, { method: "DELETE" });
    setRefresh(r => !r);
  };

  const handleSuccess = () => { setEditId(null); setEditData(null); setMode("list"); setRefresh(r => !r); };
  const handleCancel  = () => { setEditId(null); setEditData(null); setMode("list"); };

  const columns = [
    { key: "nom_prenom_client", header: "Nom & Prénom" },
    { key: "cin_client",        header: "CIN" },
    { key: "tel_client",        header: "Téléphone" },
    { key: "email_client",      header: "Email" },
    { key: "statut_client",     header: "Statut" },
    { key: "obs_client",        header: "Observations" },
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
          onClick={() => { setEditId(null); setEditData(null); setMode("form"); }}>
          <FaUserPlus className="inline mr-2" />Saisie
        </button>
        <button className={`px-5 py-2 rounded-r-lg bg-green-600 text-white shadow font-semibold text-lg ${mode==="list"?"ring-2 ring-green-400":"opacity-80"}`}
          onClick={() => { setMode("list"); setRefresh(r => !r); }}>
          <FaListUl className="inline mr-2" />Liste
        </button>
      </div>
      {mode === "form" ? (
        <ClientForm editId={editId} editData={editData} onSuccess={handleSuccess} onCancel={handleCancel} />
      ) : (
        <Card className="mt-2"><PageHeader title="Liste des Clients" /><DataTable columns={columns} data={items} /></Card>
      )}
    </div>
  );
}
