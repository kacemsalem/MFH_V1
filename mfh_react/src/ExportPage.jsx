import { useState } from "react";
import * as XLSX from "xlsx";

const API = {
  lots:      "/api/lots/",
  dossiers:  "/api/dossiers/",
  clients:   "/api/clients/",
  notaires:  "/api/notaires/",
};

const fmtDate = v => v ? v.split("-").reverse().join("/") : "";
const fmt     = v => v != null && v !== "" ? Number(v) : "";

const LOT_SIT  = { LIBRE: "Libre", OPTION: "Option", RESERVE: "Réservé", VENDU: "Vendu" };
const DOS_SIT  = { RESERVATION: "Réservation", VENTE: "Vente", DESISTEMENT: "Désistement" };

// Auto-fit column widths (max 60 chars)
function autoCols(headerValues, rows) {
  return headerValues.map((h, i) => {
    const key = Object.keys(rows[0] ?? {})[i];
    const maxData = rows.reduce((m, r) => Math.max(m, String(r[key] ?? "").length), 0);
    return { wch: Math.min(60, Math.max(h.length + 2, maxData)) };
  });
}

function makeSheet(rows, headers) {
  const keys   = Object.keys(headers);
  const labels = Object.values(headers);
  // Row 1 = header labels, rows 2..N = data
  const ws = XLSX.utils.aoa_to_sheet([labels]);
  XLSX.utils.sheet_add_json(ws, rows, { header: keys, skipHeader: true, origin: "A2" });
  ws["!cols"] = autoCols(labels, rows);
  return ws;
}

// Sort helpers
function sortKey(a, b) {
  // Natural sort: extract numeric parts from tranche/n_titre
  const nat = (s) => String(s ?? "").replace(/(\d+)/g, n => n.padStart(10, "0"));
  const ka = `${nat(a._tranche)}__${nat(a._ntitle)}`;
  const kb = `${nat(b._tranche)}__${nat(b._ntitle)}`;
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

async function buildWorkbook() {
  const [lots, dossiers, clients, notaires] = await Promise.all([
    fetch(API.lots).then(r => r.json()),
    fetch(API.dossiers).then(r => r.json()),
    fetch(API.clients).then(r => r.json()),
    fetch(API.notaires).then(r => r.json()),
  ]);

  // Build lot lookup by id
  const lotById = Object.fromEntries(lots.map(l => [l.id, l]));

  // ── Sheet 1: Lots ────────────────────────────────────────────────────────
  const LOT_HEADERS = {
    tranche:      "Tranche",
    n_titre:      "N° Titre",
    ilot:         "Îlot",
    lot:          "Lot N°",
    categorie:    "Catégorie",
    surface:      "Surface (m²)",
    prix_ref:     "Prix Référence (DH)",
    situation:    "Situation",
    designation:  "Désignation",
    obs_lot:      "Observations",
  };

  const lotsRows = lots
    .map(l => ({ _tranche: l.tranche, _ntitle: l.n_titre, ...l }))
    .sort(sortKey)
    .map(l => ({
      tranche:     l.tranche     ?? "",
      n_titre:     l.n_titre     ?? "",
      ilot:        l.ilot        ?? "",
      lot:         l.lot         ?? "",
      categorie:   l.categorie   ?? "",
      surface:     fmt(l.surface),
      prix_ref:    fmt(l.prix_ref),
      situation:   LOT_SIT[l.situation] ?? l.situation ?? "",
      designation: l.designation ?? "",
      obs_lot:     l.obs_lot     ?? "",
    }));

  // ── Sheet 2: Dossiers ────────────────────────────────────────────────────
  const DOS_HEADERS = {
    tranche:           "Tranche",
    n_titre:           "N° Titre",
    ilot:              "Îlot",
    lot_num:           "Lot N°",
    client:            "Client",
    notaire:           "Notaire",
    commercial:        "Commercial",
    situation:         "Situation",
    date_reservation:  "Date Réservation",
    date_vente:        "Date Acte Vente",
    date_desistement:  "Date Désistement",
    prix_vente:        "Prix Vente (DH)",
    total_recu:        "Total Reçu (DH)",
    total_livre:       "Total Reversé (DH)",
    montant_restant:   "Reste Dû (DH)",
    solde_caisse:      "Solde Caisse (DH)",
    actif:             "Actif",
  };

  const dossiersRows = dossiers
    .map(d => {
      const lot = lotById[d.lot] || {};
      return {
        _tranche: lot.tranche,
        _ntitle:  lot.n_titre,
        tranche:           lot.tranche      ?? "",
        n_titre:           lot.n_titre      ?? "",
        ilot:              lot.ilot         ?? "",
        lot_num:           lot.lot          ?? "",
        client:            d.client_display ?? d.client ?? "",
        notaire:           d.notaire_display ?? d.notaire ?? "",
        commercial:        d.commercial_display ?? d.commercial ?? "",
        situation:         DOS_SIT[d.situation] ?? d.situation ?? "",
        date_reservation:  fmtDate(d.date_reservation),
        date_vente:        fmtDate(d.date_vente),
        date_desistement:  fmtDate(d.date_desistement),
        prix_vente:        fmt(d.prix_vente),
        total_recu:        fmt(d.total_recu),
        total_livre:       fmt(d.total_livre),
        montant_restant:   fmt(d.montant_restant),
        solde_caisse:      fmt(d.solde_caisse),
        actif:             d.actif ? "Oui" : "Non",
      };
    })
    .sort(sortKey);

  // ── Sheet 3: Clients ─────────────────────────────────────────────────────
  const CLI_HEADERS = {
    nom_prenom_client: "Nom & Prénom",
    cin_client:        "CIN",
    tel_client:        "Téléphone",
    email_client:      "Email",
    statut_client:     "Statut",
    obs_client:        "Observations",
  };

  const clientsRows = clients
    .sort((a, b) => (a.nom_prenom_client ?? "").localeCompare(b.nom_prenom_client ?? "", "fr"))
    .map(c => ({
      nom_prenom_client: c.nom_prenom_client ?? "",
      cin_client:        c.cin_client        ?? "",
      tel_client:        c.tel_client        ?? "",
      email_client:      c.email_client      ?? "",
      statut_client:     c.statut_client     ?? "",
      obs_client:        c.obs_client        ?? "",
    }));

  // ── Sheet 4: Notaires ────────────────────────────────────────────────────
  const NOT_HEADERS = {
    nom_prenom_not: "Nom & Prénom",
    tel_notaire:    "Téléphone",
    email_notaire:  "Email",
    obs_notaire:    "Observations",
  };

  const notairesRows = notaires
    .sort((a, b) => (a.nom_prenom_not ?? "").localeCompare(b.nom_prenom_not ?? "", "fr"))
    .map(n => ({
      nom_prenom_not: n.nom_prenom_not ?? "",
      tel_notaire:    n.tel_notaire    ?? "",
      email_notaire:  n.email_notaire  ?? "",
      obs_notaire:    n.obs_notaire    ?? "",
    }));

  // ── Build workbook ───────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(lotsRows,     LOT_HEADERS), "Lots");
  XLSX.utils.book_append_sheet(wb, makeSheet(dossiersRows, DOS_HEADERS), "Dossiers");
  XLSX.utils.book_append_sheet(wb, makeSheet(clientsRows,  CLI_HEADERS), "Clients");
  XLSX.utils.book_append_sheet(wb, makeSheet(notairesRows, NOT_HEADERS), "Notaires");

  return { wb, lots: lotsRows.length, dossiers: dossiersRows.length, clients: clientsRows.length, notaires: notairesRows.length };
}

export default function ExportPage() {
  const [loading, setLoading] = useState(false);
  const [stats,   setStats]   = useState(null);
  const [error,   setError]   = useState("");

  const handleExport = async () => {
    setLoading(true); setError(""); setStats(null);
    try {
      const { wb, ...counts } = await buildWorkbook();
      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `MFH_Export_${today}.xlsx`);
      setStats(counts);
    } catch (e) {
      setError("Erreur lors de la génération : " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#1e3a5f", marginBottom: 6 }}>
        Export Excel
      </div>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 28 }}>
        Génère un fichier <strong>.xlsx</strong> contenant 4 feuilles : Lots, Dossiers, Clients, Notaires.
      </p>

      {/* Sheets preview */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
        {[
          { icon: "🏘️", label: "Lots",      desc: "Triés par tranche · n° titre" },
          { icon: "📁", label: "Dossiers",  desc: "Triés par tranche · n° titre" },
          { icon: "👥", label: "Clients",   desc: "Triés alphabétiquement" },
          { icon: "⚖️", label: "Notaires",  desc: "Triés alphabétiquement" },
        ].map(({ icon, label, desc }) => (
          <div key={label} style={{
            background: "#f8fafc", border: "1px solid #e2e8f0",
            borderRadius: 10, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1e3a5f" }}>{label}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{desc}</div>
          </div>
        ))}
      </div>

      <button
        onClick={handleExport}
        disabled={loading}
        style={{
          width: "100%", padding: "14px 0", borderRadius: 10,
          background: loading ? "#93c5fd" : "#2563eb",
          color: "#fff", border: "none", fontSize: 16,
          fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          transition: "background 0.2s",
        }}
      >
        {loading ? (
          <>
            <span style={{ display: "inline-block", width: 18, height: 18, border: "3px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Chargement des données…
          </>
        ) : (
          <>⬇️ Télécharger le fichier Excel</>
        )}
      </button>

      {error && (
        <div style={{ marginTop: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, color: "#dc2626", fontSize: 13 }}>
          {error}
        </div>
      )}

      {stats && (
        <div style={{ marginTop: 20, padding: "14px 18px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10 }}>
          <div style={{ fontWeight: 700, color: "#15803d", marginBottom: 8 }}>✅ Fichier généré avec succès</div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              ["Lots",      stats.lots],
              ["Dossiers",  stats.dossiers],
              ["Clients",   stats.clients],
              ["Notaires",  stats.notaires],
            ].map(([label, count]) => (
              <div key={label} style={{ fontSize: 13, color: "#166534" }}>
                <strong>{count}</strong> {label}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
