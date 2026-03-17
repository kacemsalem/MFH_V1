import { useState, useEffect } from "react";
import { Card, PageHeader, DataTable } from "./ui-kit";

const API_USERS = "/api/users/";
const API_COMM  = "/api/commerciaux/";

const ROLES = [
  { value: "ADMIN",      label: "Administrateur", color: "#dc2626", bg: "#fef2f2" },
  { value: "VIEWER",     label: "Lecteur",        color: "#2563eb", bg: "#eff6ff" },
  { value: "COMMERCIAL", label: "Commercial",     color: "#7c3aed", bg: "#f5f3ff" },
];

const roleBadge = (role) => {
  const r = ROLES.find(x => x.value === role) || { label: role, color: "#6b7280", bg: "#f3f4f6" };
  return (
    <span style={{ background: r.bg, color: r.color, borderRadius: 9999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
      {r.label}
    </span>
  );
};

const initialForm = { username: "", email: "", first_name: "", last_name: "", password: "", role: "VIEWER", commercial_id: "", is_active: true };

const btnStyle = (color) => ({
  background: "transparent", color, border: `1px solid ${color}`,
  borderRadius: 6, padding: "2px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600,
});

export default function UsersPage() {
  const [mode, setMode]       = useState("list");
  const [items, setItems]     = useState([]);
  const [commerciaux, setCommerciaux] = useState([]);
  const [form, setForm]       = useState(initialForm);
  const [editId, setEditId]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    fetch(API_USERS).then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : d.results ?? [])).catch(() => {});
    fetch(API_COMM).then(r => r.json()).then(d => setCommerciaux(d)).catch(() => {});
  }, [refresh]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleEdit = (row) => {
    setForm({
      username:      row.username      || "",
      email:         row.email         || "",
      first_name:    row.first_name    || "",
      last_name:     row.last_name     || "",
      password:      "",
      role:          row.role          || "VIEWER",
      commercial_id: row.commercial_id || "",
      is_active:     row.is_active,
    });
    setEditId(row.id);
    setMode("form");
    setError("");
  };

  const handleToggleActive = async (row) => {
    await fetch(`${API_USERS}${row.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !row.is_active }),
    });
    setRefresh(r => !r);
  };

  const handleCancel = () => { setForm(initialForm); setEditId(null); setMode("list"); };

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setError("");
    const body = { ...form };
    if (!body.password) delete body.password;
    if (body.commercial_id === "") body.commercial_id = null;
    try {
      const res = await fetch(editId ? `${API_USERS}${editId}/` : API_USERS, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(JSON.stringify(d)); }
      setForm(initialForm); setEditId(null); setMode("list"); setRefresh(r => !r);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const columns = [
    { key: "username",  header: "Identifiant",   render: v => <span style={{ fontWeight: 700 }}>{v}</span> },
    { key: "first_name", header: "Prénom" },
    { key: "last_name",  header: "Nom" },
    { key: "email",      header: "Email" },
    { key: "role",       header: "Rôle",   render: v => roleBadge(v) },
    { key: "commercial_name", header: "Commercial lié", render: v => v || "—" },
    { key: "is_active",  header: "Statut",
      render: v => <span style={{ fontSize: 11, fontWeight: 700, color: v ? "#059669" : "#dc2626" }}>{v ? "Actif" : "Inactif"}</span> },
    { key: "_actions", header: "",
      render: (_, row) => (
        <span style={{ display: "flex", gap: 6 }}>
          <button onClick={() => handleEdit(row)} style={btnStyle("#2563eb")}>Modifier</button>
          <button onClick={() => handleToggleActive(row)} style={btnStyle(row.is_active ? "#dc2626" : "#059669")}>
            {row.is_active ? "Désactiver" : "Activer"}
          </button>
        </span>
      )},
  ];

  return (
    <div>
      <div className="flex justify-center mb-8 gap-2">
        <button className={`px-5 py-2 rounded-l-lg bg-blue-600 text-white shadow font-semibold text-lg ${mode === "form" ? "ring-2 ring-blue-400" : "opacity-80"}`}
          onClick={() => { setForm(initialForm); setEditId(null); setMode("form"); }}>
          Saisie
        </button>
        <button className={`px-5 py-2 rounded-r-lg bg-green-600 text-white shadow font-semibold text-lg ${mode === "list" ? "ring-2 ring-green-400" : "opacity-80"}`}
          onClick={() => { setMode("list"); setRefresh(r => !r); }}>
          Liste
        </button>
      </div>

      {mode === "form" && (
        <Card className="max-w-xl mx-auto mt-2">
          <PageHeader title={editId ? "Modifier l'utilisateur" : "Nouvel utilisateur"} />
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Prénom
                <input name="first_name" value={form.first_name} onChange={handleChange} className="border p-2 rounded font-normal" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Nom
                <input name="last_name" value={form.last_name} onChange={handleChange} className="border p-2 rounded font-normal" />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Identifiant (username)
              <input name="username" value={form.username} onChange={handleChange} className="border p-2 rounded font-normal" required />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Email
              <input name="email" type="email" value={form.email} onChange={handleChange} className="border p-2 rounded font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">
              {editId ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe"}
              <input name="password" type="password" value={form.password} onChange={handleChange} className="border p-2 rounded font-normal"
                required={!editId} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">Rôle
              <select name="role" value={form.role} onChange={handleChange} className="border p-2 rounded font-normal">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            {form.role === "COMMERCIAL" && (
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">
                Lier à une fiche commerciale
                <select name="commercial_id" value={form.commercial_id} onChange={handleChange} className="border p-2 rounded font-normal">
                  <option value="">— Aucune —</option>
                  {commerciaux.map(c => <option key={c.id} value={c.id}>{c.nom_prenom}</option>)}
                </select>
              </label>
            )}
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
              Compte actif
            </label>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded shadow w-full font-semibold text-lg disabled:opacity-60">
              {loading ? "Enregistrement…" : editId ? "Mettre à jour" : "Créer l'utilisateur"}
            </button>
            {editId && (
              <button type="button" onClick={handleCancel}
                className="bg-gray-400 text-white px-6 py-2 rounded shadow w-full font-semibold text-lg">
                Annuler
              </button>
            )}
          </form>
        </Card>
      )}

      {mode === "list" && (
        <Card className="mt-2">
          <PageHeader title="Gestion des utilisateurs" />
          {/* Légende des rôles */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {ROLES.map(r => (
              <span key={r.value} style={{ background: r.bg, color: r.color, borderRadius: 9999, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
                {r.label}
              </span>
            ))}
          </div>
          <DataTable columns={columns} data={items} />
        </Card>
      )}
    </div>
  );
}
