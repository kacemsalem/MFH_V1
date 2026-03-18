import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, DataTable } from "./ui-kit";
import { useAuth } from "./AuthContext";

const API = {
  dossiers:  "/api/dossiers/",
  caisse:    "/api/caisse/",
  bootstrap: "/api/bootstrap/",
  clients:   "/api/clients/",
  notaires:  "/api/notaires/",
  commerciaux: "/api/commerciaux/",
};

const initialDossier = {
  lot: "", client: "", notaire: "", commercial: "",
  prix_vente: "", situation_dossier: "RESERVATION",
  date_reservation: "", date_vente: "", date_desistement: "",
  actif: true,
};

const SIT = {
  RESERVATION: { bg:"#fef3c7", color:"#92400e", label:"Réservation" },
  VENTE:       { bg:"#d1fae5", color:"#065f46", label:"Vente" },
  DESISTEMENT: { bg:"#fee2e2", color:"#991b1b", label:"Désistement" },
};

const B = {
  blue:  { background:"#2563eb", color:"#fff", border:"none" },
  green: { background:"#059669", color:"#fff", border:"none" },
  amber: { background:"#d97706", color:"#fff", border:"none" },
  gray:  { background:"#6b7280", color:"#fff", border:"none" },
  oBlue: { background:"transparent", color:"#2563eb", border:"1px solid #2563eb" },
  oRed:  { background:"transparent", color:"#dc2626", border:"1px solid #dc2626" },
};
const btn = (v, extra={}) => ({
  ...B[v], borderRadius:6, padding:"5px 14px",
  fontSize:13, cursor:"pointer", fontWeight:600, ...extra,
});
const inp = {
  display:"block", width:"100%", border:"1px solid #e5e7eb",
  borderRadius:6, padding:"7px 8px", marginTop:2, fontSize:13,
};

const fmt = v => Number(v||0).toLocaleString("fr-FR");
const fmtDate = v => v ? v.split("-").reverse().join("/") : "—";

function StatCard({ label, value, color }) {
  return (
    <div style={{ background:"#f8fafc", border:`2px solid ${color}30`, borderRadius:12, padding:"12px 18px", minWidth:150 }}>
      <div style={{ fontSize:11, color:"#6b7280", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:22, color, fontWeight:800, fontFamily:"monospace" }}>{fmt(value)}</div>
    </div>
  );
}

function SitBadge({ value }) {
  const s = SIT[value] || {};
  return (
    <span style={{ background:s.bg, color:s.color, borderRadius:9999, padding:"2px 12px", fontSize:12, fontWeight:700 }}>
      {s.label || value}
    </span>
  );
}

// =====================================================
export default function DossierPage() {
  const { role } = useAuth(); const canEdit = role === "ADMIN";
  const location = useLocation();
  const [mode, setMode]         = useState("list");

  useEffect(() => { if (mode === "form" && !canEdit) setMode("list"); }, [canEdit, mode]);
  const [dossiers, setDossiers] = useState([]);
  const [current, setCurrent]   = useState(null);
  const [ops, setOps]           = useState([]);
  const [form, setForm]         = useState(initialDossier);
  const [editId, setEditId]     = useState(null);
  const [refresh, setRefresh]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const [lots, setLots]               = useState([]);
  const [lotsLibres, setLotsLibres]   = useState([]);
  const [clients, setClients]         = useState([]);
  const [notaires, setNotaires]       = useState([]);
  const [commerciaux, setCommerciaux] = useState([]);

  const [showCaisse, setShowCaisse]       = useState(false);
  const [caisseForm, setCaisseForm]       = useState({});
  const [caisseLoading, setCaisseLoading] = useState(false);
  const [caisseError, setCaisseError]     = useState("");

  // Ajout rapide client/notaire/commercial depuis le formulaire dossier
  const [showQuickAdd, setShowQuickAdd]   = useState(null); // "client"|"notaire"|"commercial"
  const [quickForm, setQuickForm]         = useState({});
  const [quickLoading, setQuickLoading]   = useState(false);
  const [quickError, setQuickError]       = useState("");

  // Modal confirmation vente / désistement avec date modifiable
  const [actionModal, setActionModal]     = useState(null); // {type:"VENTE"|"DESISTEMENT", date, label, dateKey}
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]     = useState("");

  // Liste — recherche, filtre & pagination
  const [search, setSearch]   = useState("");
  const [dossSit, setDossSit] = useState("");
  const [dossSort, setDossSort] = useState({ key: "", dir: 1 });
  const [page, setPage]       = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetch(API.bootstrap)
      .then(r => r.json())
      .then(d => {
        setLots(d.lots);
        setLotsLibres(d.lots_libres);
        setClients(d.clients);
        setNotaires(d.notaires);
        setCommerciaux(d.commerciaux);
      })
      .catch(() => {});
  }, [refresh]);

  useEffect(() => {
    fetch(API.dossiers).then(r=>r.json()).then(setDossiers).catch(()=>setDossiers([]));
  }, [refresh]);

  useEffect(() => {
    if (!current?.id) return;
    fetch(`${API.caisse}?dossier=${current.id}`)
      .then(r=>r.json()).then(setOps).catch(()=>setOps([]));
  }, [current?.id, refresh]);

  // Ouvrir directement le dashboard si on arrive avec un dossierId dans l'état de navigation
  useEffect(() => {
    const id = location.state?.dossierId;
    if (!id) return;
    fetch(`${API.dossiers}${id}/`)
      .then(r => r.json())
      .then(d => { setCurrent(d); setMode("dashboard"); })
      .catch(() => {});
    // Effacer le state pour ne pas ré-ouvrir lors d'un refresh
    window.history.replaceState({}, "");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type==="checkbox" ? checked : value }));
  };

  const openForm = (row=null) => {
    if (row) {
      const { id, total_recu, total_livre, montant_restant, solde_caisse,
              lot_display, client_display, notaire_display, commercial_display, ...fields } = row;
      setForm({ ...initialDossier, ...fields, notaire:fields.notaire||"", commercial:fields.commercial||"" });
      setEditId(id);
    } else {
      setForm(initialDossier); setEditId(null);
    }
    setError(""); setMode("form");
  };

  const openDashboard = async (row) => {
    const fresh = await fetch(`${API.dossiers}${row.id}/`).then(r=>r.json()).catch(()=>row);
    setCurrent(fresh); setMode("dashboard");
  };

  const refreshDashboard = async () => {
    if (!current?.id) return;
    const fresh = await fetch(`${API.dossiers}${current.id}/`).then(r=>r.json()).catch(()=>current);
    setCurrent(fresh);
    setRefresh(r=>!r);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce dossier ?")) return;
    await fetch(`${API.dossiers}${id}/`, { method:"DELETE" });
    setRefresh(r=>!r);
  };

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const payload = { ...form };
      if (!payload.notaire) payload.notaire = null;
      if (!payload.commercial) payload.commercial = null;
      if (!payload.date_reservation) payload.date_reservation = null;
      if (!payload.date_vente) payload.date_vente = null;
      if (!payload.date_desistement) payload.date_desistement = null;
      const res = await fetch(editId ? `${API.dossiers}${editId}/` : API.dossiers, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = `Erreur ${res.status}`;
        try { const d = await res.json(); msg = Object.values(d).flat().join(" | "); } catch {}
        throw new Error(msg);
      }
      setMode("list"); setRefresh(r=>!r);
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const QUICK_CFG = {
    client:     { url: API.clients,     label: "Client",     idKey: "id", labelKey: "nom_prenom_client",
      fields: [
        { name:"nom_prenom_client", label:"Nom & Prénom *", type:"text", required:true },
        { name:"cin_client",        label:"CIN",            type:"text" },
        { name:"tel_client",        label:"Téléphone",      type:"text" },
        { name:"email_client",      label:"Email",          type:"email" },
      ]},
    notaire:    { url: API.notaires,    label: "Notaire",    idKey: "id", labelKey: "nom_prenom_not",
      fields: [
        { name:"nom_prenom_not", label:"Nom & Prénom *", type:"text", required:true },
        { name:"tel_notaire",    label:"Téléphone",      type:"text" },
        { name:"email_notaire",  label:"Email",          type:"email" },
      ]},
    commercial: { url: API.commerciaux, label: "Commercial", idKey: "id", labelKey: "nom_prenom",
      fields: [
        { name:"nom_prenom", label:"Nom & Prénom *", type:"text", required:true },
        { name:"tel_comm",   label:"Téléphone",      type:"text" },
        { name:"email_comm", label:"Email",          type:"email" },
      ]},
  };

  const openQuickAdd = (type) => {
    setQuickForm({}); setQuickError(""); setShowQuickAdd(type);
  };

  const handleQuickSave = async (e) => {
    e.preventDefault(); setQuickLoading(true); setQuickError("");
    const cfg = QUICK_CFG[showQuickAdd];
    try {
      const res = await fetch(cfg.url, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(quickForm),
      });
      if (!res.ok) { const d=await res.json(); throw new Error(Object.values(d).flat().join(" | ")); }
      const created = await res.json();
      // Mettre à jour la liste et pré-sélectionner le nouvel élément
      if (showQuickAdd==="client") {
        setClients(c=>[...c, created]);
        setForm(f=>({...f, client: created.id}));
      } else if (showQuickAdd==="notaire") {
        setNotaires(n=>[...n, created]);
        setForm(f=>({...f, notaire: created.id}));
      } else {
        setCommerciaux(c=>[...c, created]);
        setForm(f=>({...f, commercial: created.id}));
      }
      setShowQuickAdd(null);
    } catch(err) { setQuickError(err.message); }
    finally { setQuickLoading(false); }
  };

  const openCaisseModal = (defaults={}) => {
    setCaisseForm({
      date_caisse: new Date().toISOString().split("T")[0],
      reference_caisse:"", type_ops:"COMPLEMENT",
      montant_recu:"0", montant_livre:"0", obs_caisse:"",
      ...defaults,
    });
    setCaisseError(""); setShowCaisse(true);
  };

  const handleCaisseSubmit = async e => {
    e.preventDefault(); setCaisseLoading(true); setCaisseError("");
    const { id, ...fields } = caisseForm;
    try {
      const url    = id ? `${API.caisse}${id}/` : API.caisse;
      const method = id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ ...fields, dossier: current.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(Object.values(d).flat().join(" | "));
      }
      setShowCaisse(false);
      await refreshDashboard();
    } catch(err) { setCaisseError(err.message); }
    finally { setCaisseLoading(false); }
  };

  const patch = async (data) => {
    setError("");
    try {
      const res = await fetch(`${API.dossiers}${current.id}/`, {
        method:"PATCH",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(Object.values(d).flat().join(" | "));
      }
      await refreshDashboard();
    } catch(err) { setError(err.message); }
  };

  const openEditCaisse = (op) => {
    setCaisseForm({
      id:               op.id,
      date_caisse:      op.date_caisse,
      reference_caisse: op.reference_caisse || "",
      type_ops:         op.type_ops,
      montant_recu:     op.montant_recu,
      montant_livre:    op.montant_livre,
      obs_caisse:       op.obs_caisse || "",
    });
    setCaisseError(""); setShowCaisse(true);
  };

  const handleDeleteCaisse = async (id) => {
    if (!window.confirm("Supprimer cette opération ?")) return;
    await fetch(`${API.caisse}${id}/`, { method:"DELETE" });
    await refreshDashboard();
  };

  const openActionModal = (type) => {
    const today = new Date().toISOString().split("T")[0];
    if (type === "VENTE") {
      setActionModal({ type, label:"Valider la vente", dateKey:"date_vente",
        date: current.date_vente || today });
    } else {
      setActionModal({ type, label:"Enregistrer le désistement", dateKey:"date_desistement",
        date: current.date_desistement || today });
    }
    setActionError("");
  };

  const handleActionConfirm = async (e) => {
    e.preventDefault(); setActionLoading(true); setActionError("");
    try {
      const payload = { situation_dossier: actionModal.type, [actionModal.dateKey]: actionModal.date };
      const res = await fetch(`${API.dossiers}${current.id}/`, {
        method:"PATCH",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(Object.values(d).flat().join(" | "));
      }
      setActionModal(null);
      await refreshDashboard();
    } catch(err) { setActionError(err.message); }
    finally { setActionLoading(false); }
  };

  // ---- Colonnes liste ----
  const colsList = [
    { key:"id", header:"N° Dossier",
      render: v => (
        <span style={{
          fontFamily:"monospace", fontWeight:700, fontSize:12,
          background:"#eff6ff", color:"#1d4ed8",
          borderRadius:6, padding:"2px 8px",
        }}>#{v}</span>
      )},
    { key:"lot_display",    header:"Lot" },
    { key:"client_display", header:"Client" },
    { key:"situation_dossier", header:"Situation", render: v => <SitBadge value={v} /> },
    { key:"prix_vente",     header:"Prix vente",
      render: v => <span style={{fontFamily:"monospace"}}>{fmt(v)}</span> },
    { key:"total_recu",     header:"Reçu",
      render: v => <span style={{fontFamily:"monospace", color:"#059669", fontWeight:700}}>{fmt(v)}</span> },
    { key:"montant_restant", header:"Reste dû",
      render: v => {
        const n=Number(v);
        return <span style={{fontFamily:"monospace", fontWeight:700, color:n===0?"#059669":n>0?"#d97706":"#dc2626"}}>{fmt(v)}</span>;
      }},
    { key:"_act", header:"",
      render: (_,row) => (
        <span style={{display:"flex", gap:4, alignItems:"center"}}>
          <button onClick={()=>openDashboard(row)} style={btn("blue")}>Ouvrir</button>
          {canEdit && <button onClick={()=>openForm(row)} title="Modifier"
            style={{background:"transparent", border:"1px solid #2563eb", borderRadius:6,
              padding:"4px 7px", cursor:"pointer", fontSize:15, lineHeight:1, color:"#2563eb"}}>✏️</button>}
          {canEdit && <button onClick={()=>handleDelete(row.id)} title="Supprimer"
            style={{background:"transparent", border:"1px solid #dc2626", borderRadius:6,
              padding:"4px 7px", cursor:"pointer", fontSize:15, lineHeight:1, color:"#dc2626"}}>🗑️</button>}
        </span>
      )},
  ];

  const colsCaisse = [
    { key:"date_caisse", header:"Date", render: v => fmtDate(v) },
    { key:"reference_caisse", header:"Référence" },
    { key:"type_ops",         header:"Type" },
    { key:"montant_recu",  header:"Reçu",
      render: v => <span style={{fontFamily:"monospace", color:"#059669", fontWeight:600}}>{fmt(v)}</span> },
    { key:"montant_livre", header:"Reversé",
      render: v => <span style={{fontFamily:"monospace", color:"#7c3aed", fontWeight:600}}>{fmt(v)}</span> },
    { key:"obs_caisse", header:"Observation" },
    ...(canEdit ? [{ key:"_act", header:"",
      render: (_, row) => (
        <span style={{display:"flex", gap:5}}>
          <button onClick={()=>openEditCaisse(row)}        style={btn("oBlue", {padding:"2px 10px", fontSize:12})}>Modifier</button>
          <button onClick={()=>handleDeleteCaisse(row.id)} style={btn("oRed",  {padding:"2px 10px", fontSize:12})}>Supprimer</button>
        </span>
      )}] : []),
  ];

  // =====================================================
  // DASHBOARD
  // =====================================================
  if (mode==="dashboard" && current) {
    const sit     = SIT[current.situation_dossier] || {};
    const restant = Number(current.montant_restant||0);
    const prix    = Number(current.prix_vente||0);
    const recu    = Number(current.total_recu||0);
    const pct     = prix>0 ? Math.min(100,(recu/prix)*100) : 0;
    const barColor= pct===100?"#059669":pct>=50?"#d97706":"#dc2626";

    return (
      <div style={{maxWidth:920, margin:"0 auto"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
          <button onClick={()=>{setMode("list"); setRefresh(r=>!r);}} style={btn("gray")}>← Liste</button>
          {canEdit && <button onClick={()=>openForm(current)} style={btn("oBlue")}>✏ Modifier dossier</button>}
        </div>

        {error && <div style={{background:"#fee2e2", color:"#991b1b", borderRadius:8, padding:"8px 14px", marginBottom:12, fontSize:13}}>{error}</div>}

        {/* Section 1 — Infos dossier */}
        <Card className="mb-4">
          <div style={{display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12, alignItems:"flex-start"}}>
            <div>
              <div style={{display:"flex", alignItems:"center", gap:10, flexWrap:"wrap"}}>
                <span style={{fontSize:24, fontWeight:800, color:"#1e3a5f"}}>{current.client_display}</span>
                <span style={{
                  fontFamily:"monospace", fontWeight:700, fontSize:13,
                  background:"#eff6ff", color:"#1d4ed8",
                  borderRadius:6, padding:"3px 10px",
                }}>#{current.id}</span>
              </div>
              <div style={{color:"#374151", fontWeight:600, marginTop:2}}>{current.lot_display}</div>
              <div style={{color:"#6b7280", fontSize:13, marginTop:4}}>
                Notaire : <b>{current.notaire_display||"—"}</b>
                &nbsp;·&nbsp;Commercial : <b>{current.commercial_display||"—"}</b>
              </div>
              <div style={{marginTop:6, fontSize:12, color:"#6b7280", display:"flex", gap:16}}>
                {current.date_reservation && <span>Réservation : <b>{fmtDate(current.date_reservation)}</b></span>}
                {current.date_vente       && <span>Vente : <b>{fmtDate(current.date_vente)}</b></span>}
                {current.date_desistement && <span>Désistement : <b>{fmtDate(current.date_desistement)}</b></span>}
              </div>
            </div>
            <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8}}>
              <SitBadge value={current.situation_dossier} />
              <span style={{fontSize:12, fontWeight:600, color:current.actif?"#059669":"#dc2626"}}>
                {current.actif ? "● Actif" : "○ Clôturé"}
              </span>
            </div>
          </div>
          <div style={{marginTop:16}}>
            <div style={{display:"flex", justifyContent:"space-between", fontSize:12, color:"#6b7280", marginBottom:4}}>
              <span>Avancement paiement</span>
              <span style={{fontWeight:700, color:barColor}}>{pct.toFixed(1)} %</span>
            </div>
            <div style={{background:"#f0f0f0", borderRadius:999, height:12, overflow:"hidden"}}>
              <div style={{width:`${pct}%`, background:barColor, height:12, borderRadius:999, transition:"width .4s"}} />
            </div>
          </div>
        </Card>

        {/* Section 2 — Résumé financier */}
        <Card className="mb-4">
          <div style={{fontWeight:700, fontSize:13, color:"#6b7280", marginBottom:12, textTransform:"uppercase", letterSpacing:1}}>Résumé financier</div>
          <div style={{display:"flex", gap:14, flexWrap:"wrap"}}>
            <StatCard label="Prix de vente"  value={current.prix_vente}      color="#2563eb" />
            <StatCard label="Total reçu"     value={current.total_recu}      color="#059669" />
            <StatCard label="Total reversé"  value={current.total_livre}     color="#7c3aed" />
            <StatCard label="Reste dû"       value={current.montant_restant} color={restant===0?"#059669":"#dc2626"} />
            <StatCard label="Solde caisse"   value={current.solde_caisse}    color="#d97706" />
          </div>
        </Card>

        {/* Section 3 — Actions */}
        <Card className="mb-4">
          <div style={{fontWeight:700, fontSize:13, color:"#6b7280", marginBottom:12, textTransform:"uppercase", letterSpacing:1}}>Actions rapides</div>
          <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
            <button style={btn("green")} onClick={()=>openCaisseModal({type_ops:"COMPLEMENT", montant_livre:"0"})}>
              + Ajouter paiement
            </button>
            <button style={btn("amber")} onClick={()=>openCaisseModal({type_ops:"REMBOURSEMENT", montant_recu:"0"})}>
              + Remboursement
            </button>
            {current.situation_dossier==="RESERVATION" && restant===0 && (
              <button style={btn("blue")} onClick={()=>openActionModal("VENTE")}>
                ✓ Valider la vente
              </button>
            )}
            {current.situation_dossier==="RESERVATION" && (
              <button style={btn("oRed")} onClick={()=>openActionModal("DESISTEMENT")}>
                ✕ Désistement
              </button>
            )}
          </div>
        </Card>

        {/* Section 4 — Historique paiements */}
        <Card>
          <div style={{fontWeight:700, fontSize:13, color:"#6b7280", marginBottom:12, textTransform:"uppercase", letterSpacing:1}}>Historique des paiements</div>
          {ops.length===0
            ? <p style={{color:"#9ca3af", fontSize:13}}>Aucune opération enregistrée.</p>
            : <>
                <DataTable columns={colsCaisse} data={ops} />
                <div style={{display:"flex", gap:24, justifyContent:"flex-end", marginTop:12, fontSize:13, fontWeight:700}}>
                  <span style={{color:"#059669"}}>Total reçu : {fmt(current.total_recu)}</span>
                  <span style={{color:"#7c3aed"}}>Total reversé : {fmt(current.total_livre)}</span>
                  <span style={{color:restant===0?"#059669":"#dc2626"}}>Reste dû : {fmt(current.montant_restant)}</span>
                </div>
              </>
          }
        </Card>

        {/* Modal caisse */}
        {showCaisse && (
          <div style={{position:"fixed", inset:0, background:"#0008", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center"}}>
            <div style={{background:"#fff", borderRadius:16, padding:28, width:440, boxShadow:"0 8px 40px #0003"}}>
              <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:18, flexWrap:"wrap"}}>
                <span style={{fontWeight:800, fontSize:18, color:"#1e3a5f"}}>
                  {caisseForm.id ? "Modifier l'opération" : "Nouvelle opération"}
                </span>
                {current?.id && (
                  <span style={{
                    fontFamily:"monospace", fontWeight:700, fontSize:39,
                    background:"#eff6ff", color:"#1d4ed8",
                    borderRadius:8, padding:"4px 16px",
                  }}>#{current.id}</span>
                )}
              </div>
              <form onSubmit={handleCaisseSubmit} style={{display:"grid", gap:12}}>
                <label style={{fontSize:13, fontWeight:600, color:"#374151"}}>Type d'opération
                  <select value={caisseForm.type_ops}
                    onChange={e=>setCaisseForm(f=>({...f, type_ops:e.target.value}))} style={inp}>
                    <option value="RESERVATION">Réservation</option>
                    <option value="COMPLEMENT">Avance / Complément</option>
                    <option value="VENTE">Vente</option>
                    <option value="REMBOURSEMENT">Remboursement</option>
                  </select>
                </label>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
                  <label style={{fontSize:13, fontWeight:600, color:"#374151"}}>Date *
                    <input type="date" value={caisseForm.date_caisse}
                      onChange={e=>setCaisseForm(f=>({...f, date_caisse:e.target.value}))} style={inp} required />
                  </label>
                  <label style={{fontSize:13, fontWeight:600, color:"#374151"}}>Référence
                    <input type="text" value={caisseForm.reference_caisse}
                      onChange={e=>setCaisseForm(f=>({...f, reference_caisse:e.target.value}))} style={inp} />
                  </label>
                </div>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
                  <label style={{fontSize:13, fontWeight:600, color:"#059669"}}>Montant reçu
                    <input type="number" min="0" value={caisseForm.montant_recu}
                      onChange={e=>setCaisseForm(f=>({...f, montant_recu:e.target.value}))} style={inp} />
                  </label>
                  <label style={{fontSize:13, fontWeight:600, color:"#7c3aed"}}>Montant reversé
                    <input type="number" min="0" value={caisseForm.montant_livre}
                      onChange={e=>setCaisseForm(f=>({...f, montant_livre:e.target.value}))} style={inp} />
                  </label>
                </div>
                <label style={{fontSize:13, fontWeight:600, color:"#374151"}}>Observation
                  <input type="text" value={caisseForm.obs_caisse}
                    onChange={e=>setCaisseForm(f=>({...f, obs_caisse:e.target.value}))} style={inp} />
                </label>
                {caisseError && <p style={{color:"#dc2626", fontSize:13}}>{caisseError}</p>}
                <div style={{display:"flex", gap:10, marginTop:4}}>
                  <button type="submit" disabled={caisseLoading}
                    style={{...btn("green"), flex:1, padding:"9px 0"}}>
                    {caisseLoading ? "Enregistrement..." : "Enregistrer"}
                  </button>
                  <button type="button" onClick={()=>setShowCaisse(false)}
                    style={{...btn("gray"), flex:1, padding:"9px 0"}}>Annuler</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal confirmation vente / désistement avec date */}
        {actionModal && (
          <div style={{position:"fixed", inset:0, background:"#0008", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center"}}>
            <div style={{background:"#fff", borderRadius:16, padding:28, width:380, boxShadow:"0 8px 40px #0003"}}>
              <div style={{fontWeight:800, fontSize:17, color:"#1e3a5f", marginBottom:6}}>
                {actionModal.label}
              </div>
              <div style={{fontSize:13, color:"#6b7280", marginBottom:18}}>
                Confirmez la date avant de valider.
              </div>
              <form onSubmit={handleActionConfirm} style={{display:"grid", gap:14}}>
                <label style={{fontSize:13, fontWeight:600, color:"#374151"}}>
                  {actionModal.type === "VENTE" ? "Date de vente *" : "Date de désistement *"}
                  <input type="date" required value={actionModal.date}
                    onChange={e=>setActionModal(m=>({...m, date:e.target.value}))}
                    style={inp} />
                </label>
                {actionError && <p style={{color:"#dc2626", fontSize:13}}>{actionError}</p>}
                <div style={{display:"flex", gap:10}}>
                  <button type="submit" disabled={actionLoading}
                    style={{...btn(actionModal.type==="VENTE"?"blue":"oRed"), flex:1, padding:"9px 0"}}>
                    {actionLoading ? "Enregistrement..." : "Confirmer"}
                  </button>
                  <button type="button" onClick={()=>setActionModal(null)}
                    style={{...btn("gray"), flex:1, padding:"9px 0"}}>Annuler</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =====================================================
  // FORMULAIRE DOSSIER
  // =====================================================
  if (mode==="form") {
    return (
      <Card style={{maxWidth:740, margin:"0 auto"}}>
        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:20}}>
          <span style={{fontSize:20, fontWeight:800, color:"#1e3a5f"}}>
            {editId ? "Modifier le Dossier" : "Nouveau Dossier"}
          </span>
          {editId && (
            <span style={{
              fontFamily:"monospace", fontWeight:700, fontSize:39,
              background:"#eff6ff", color:"#1d4ed8",
              borderRadius:8, padding:"4px 16px",
            }}>#{editId}</span>
          )}
        </div>
        <form onSubmit={handleSubmit} style={{display:"grid", gap:14}}>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            <label style={{fontSize:13, fontWeight:600, color:"#374151"}}>Lot *
              <select name="lot" value={form.lot} onChange={handleChange} required style={inp}>
                <option value="">— choisir —</option>
                {[
                  ...lotsLibres,
                  ...lots.filter(l => editId && String(l.id) === String(form.lot) && !lotsLibres.find(ll => ll.id === l.id)),
                ].sort((a, b) => {
                  const t = (a.tranche || "").localeCompare(b.tranche || "", undefined, { numeric: true });
                  if (t !== 0) return t;
                  return (a.n_titre || "").localeCompare(b.n_titre || "", undefined, { numeric: true });
                }).map(l => (
                  <option key={l.id} value={l.id}>
                    Tr.{l.tranche || "—"}{l.n_titre ? ` | ${l.n_titre}` : ""} — Îlot {l.ilot} Lot {l.lot}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <div style={{fontSize:13, fontWeight:600, color:"#374151", marginBottom:2}}>Client *</div>
              <div style={{display:"flex", gap:6}}>
                <select name="client" value={form.client} onChange={handleChange} required style={{...inp, flex:1, marginTop:0}}>
                  <option value="">— choisir —</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.nom_prenom_client}</option>)}
                </select>
                <button type="button" onClick={()=>openQuickAdd("client")} title="Nouveau client"
                  style={{...btn("green"), padding:"0 12px", fontSize:18, lineHeight:1}}>+</button>
              </div>
            </div>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            <div>
              <div style={{fontSize:13, fontWeight:600, color:"#374151", marginBottom:2}}>Notaire</div>
              <div style={{display:"flex", gap:6}}>
                <select name="notaire" value={form.notaire||""} onChange={handleChange} style={{...inp, flex:1, marginTop:0}}>
                  <option value="">— aucun —</option>
                  {notaires.map(n=><option key={n.id} value={n.id}>{n.nom_prenom_not}</option>)}
                </select>
                <button type="button" onClick={()=>openQuickAdd("notaire")} title="Nouveau notaire"
                  style={{...btn("green"), padding:"0 12px", fontSize:18, lineHeight:1}}>+</button>
              </div>
            </div>
            <div>
              <div style={{fontSize:13, fontWeight:600, color:"#374151", marginBottom:2}}>Commercial</div>
              <div style={{display:"flex", gap:6}}>
                <select name="commercial" value={form.commercial||""} onChange={handleChange} style={{...inp, flex:1, marginTop:0}}>
                  <option value="">— aucun —</option>
                  {commerciaux.map(c=><option key={c.id} value={c.id}>{c.nom_prenom}</option>)}
                </select>
                <button type="button" onClick={()=>openQuickAdd("commercial")} title="Nouveau commercial"
                  style={{...btn("green"), padding:"0 12px", fontSize:18, lineHeight:1}}>+</button>
              </div>
            </div>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            <label style={{fontSize:13, fontWeight:600, color:"#374151"}}>Prix de vente *
              <input type="number" name="prix_vente" value={form.prix_vente}
                onChange={handleChange} required min="1" style={inp} />
            </label>
            <label style={{fontSize:13, fontWeight:600, color:"#374151"}}>Situation
              <div style={{...inp, display:"flex", alignItems:"center", background:"#f3f4f6", cursor:"default"}}>
                <SitBadge value={form.situation_dossier} />
              </div>
            </label>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>
            <label style={{fontSize:13, fontWeight:600, color:"#374151"}}>Date réservation
              <input type="date" name="date_reservation" value={form.date_reservation||""} onChange={handleChange} style={inp} />
            </label>
            <label style={{fontSize:13, fontWeight:600, color:"#374151"}}>Date vente
              <input type="date" name="date_vente" value={form.date_vente||""} onChange={handleChange} style={inp} />
            </label>
            <label style={{fontSize:13, fontWeight:600, color:"#374151"}}>Date désistement
              <input type="date" name="date_desistement" value={form.date_desistement||""} onChange={handleChange} style={inp} />
            </label>
          </div>

          {error && (
            <div style={{background:"#fee2e2", color:"#991b1b", borderRadius:8, padding:"8px 14px", fontSize:13}}>{error}</div>
          )}
          <div style={{display:"flex", gap:10, marginTop:4}}>
            <button type="submit" disabled={loading}
              style={{...btn("blue"), flex:1, padding:"10px 0", fontSize:15}}>
              {loading ? "Enregistrement..." : editId ? "Mettre à jour" : "Enregistrer"}
            </button>
            <button type="button" onClick={()=>setMode("list")}
              style={{...btn("gray"), flex:1, padding:"10px 0", fontSize:15}}>Annuler</button>
          </div>
        </form>

        {/* Modal ajout rapide client / notaire / commercial */}
        {showQuickAdd && (() => {
          const cfg = QUICK_CFG[showQuickAdd];
          return (
            <div style={{position:"fixed", inset:0, background:"#0008", zIndex:60, display:"flex", alignItems:"center", justifyContent:"center"}}>
              <div style={{background:"#fff", borderRadius:16, padding:28, width:400, boxShadow:"0 8px 40px #0003"}}>
                <button type="button" onClick={()=>setShowQuickAdd(null)}
                  style={{background:"none", border:"none", color:"#2563eb", cursor:"pointer", fontWeight:700, fontSize:14, marginBottom:12, padding:0, display:"flex", alignItems:"center", gap:6}}>
                  ← Retour au dossier
                </button>
                <div style={{fontWeight:800, fontSize:17, color:"#1e3a5f", marginBottom:16}}>
                  Nouveau {cfg.label}
                </div>
                <form onSubmit={handleQuickSave} style={{display:"grid", gap:10}}>
                  {cfg.fields.map(f=>(
                    <label key={f.name} style={{fontSize:13, fontWeight:600, color:"#374151"}}>{f.label}
                      <input type={f.type} required={!!f.required}
                        value={quickForm[f.name]||""}
                        onChange={e=>setQuickForm(q=>({...q, [f.name]:e.target.value}))}
                        style={inp} />
                    </label>
                  ))}
                  {quickError && <p style={{color:"#dc2626", fontSize:13}}>{quickError}</p>}
                  <div style={{display:"flex", gap:10, marginTop:4}}>
                    <button type="submit" disabled={quickLoading}
                      style={{...btn("blue"), flex:1, padding:"8px 0"}}>
                      {quickLoading ? "Enregistrement..." : "Enregistrer"}
                    </button>
                    <button type="button" onClick={()=>setShowQuickAdd(null)}
                      style={{...btn("gray"), flex:1, padding:"8px 0"}}>Annuler</button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}
      </Card>
    );
  }

  // =====================================================
  // LISTE
  // =====================================================
  let filtered = dossiers.filter(d => {
    if (dossSit && d.situation_dossier !== dossSit) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (d.client_display  || "").toLowerCase().includes(q) ||
      (d.lot_display     || "").toLowerCase().includes(q) ||
      (d.situation_dossier || "").toLowerCase().includes(q)
    );
  });
  if (dossSort.key) {
    const numKeys = ["prix_vente", "total_recu", "montant_restant"];
    filtered = filtered.slice().sort((a, b) => {
      const va = a[dossSort.key] ?? "";
      const vb = b[dossSort.key] ?? "";
      if (numKeys.includes(dossSort.key)) return dossSort.dir * (Number(va) - Number(vb));
      return dossSort.dir * String(va).localeCompare(String(vb), undefined, { numeric: true });
    });
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
        <h1 style={{fontSize:24, fontWeight:800, color:"#1e3a5f"}}>Dossiers</h1>
        {canEdit && <button onClick={()=>openForm()} style={{...btn("blue"), padding:"8px 20px", fontSize:14}}>
          + Nouveau
        </button>}
      </div>

      {/* Barre recherche + filtres */}
      <div style={{marginBottom:12, display:"flex", gap:10, alignItems:"center", flexWrap:"wrap"}}>
        <input
          placeholder="Rechercher client, lot…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{...inp, maxWidth:260, marginTop:0, background:"#fff"}}
        />
        {/* Filtre situation */}
        {[
          { val:"",            label:"Tous" },
          { val:"RESERVATION", label:"Réservation", bg:"#fef3c7", col:"#92400e" },
          { val:"VENTE",       label:"Vente",       bg:"#d1fae5", col:"#065f46" },
          { val:"DESISTEMENT", label:"Désistement", bg:"#fee2e2", col:"#991b1b" },
        ].map(s => (
          <button key={s.val} onClick={() => { setDossSit(s.val); setPage(1); }}
            style={{
              padding:"4px 13px", borderRadius:20, fontSize:12, fontWeight:700,
              cursor:"pointer", border:"none",
              background: dossSit===s.val ? (s.bg||"#1e293b") : "#e2e8f0",
              color: dossSit===s.val ? (s.col||"#fff") : "#475569",
              outline: dossSit===s.val ? `2px solid ${s.col||"#1e293b"}` : "none",
            }}>{s.label}</button>
        ))}
        {/* Tri */}
        <select value={dossSort.key} onChange={e => setDossSort({ key: e.target.value, dir: 1 })}
          style={{...inp, marginTop:0, maxWidth:180, background:"#fff", cursor:"pointer"}}>
          <option value="">Trier par…</option>
          <option value="client_display">Client (A→Z)</option>
          <option value="lot_display">Lot</option>
          <option value="situation_dossier">Situation</option>
          <option value="prix_vente">Prix vente</option>
          <option value="total_recu">Total reçu</option>
          <option value="montant_restant">Reste dû</option>
        </select>
        {dossSort.key && (
          <button onClick={() => setDossSort(s => ({ ...s, dir: -s.dir }))}
            title="Inverser l'ordre"
            style={{...btn("gray"), padding:"4px 10px", fontSize:13}}>
            {dossSort.dir === 1 ? "▲" : "▼"}
          </button>
        )}
        <span style={{fontSize:13, color:"#6b7280", marginLeft:"auto"}}>
          {filtered.length} dossier{filtered.length!==1?"s":""}
        </span>
      </div>

      <Card>
        <DataTable columns={colsList} data={paginated} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{display:"flex", justifyContent:"center", alignItems:"center", gap:8, marginTop:16}}>
            <button onClick={()=>setPage(1)}        disabled={page===1}          style={btn("gray",{padding:"4px 10px",opacity:page===1?.4:1})}>«</button>
            <button onClick={()=>setPage(p=>p-1)}  disabled={page===1}          style={btn("gray",{padding:"4px 10px",opacity:page===1?.4:1})}>‹</button>
            <span style={{fontSize:13, color:"#374151", padding:"0 8px"}}>
              Page <strong>{page}</strong> / {totalPages}
            </span>
            <button onClick={()=>setPage(p=>p+1)}  disabled={page===totalPages} style={btn("gray",{padding:"4px 10px",opacity:page===totalPages?.4:1})}>›</button>
            <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={btn("gray",{padding:"4px 10px",opacity:page===totalPages?.4:1})}>»</button>
          </div>
        )}
      </Card>
    </div>
  );
}
