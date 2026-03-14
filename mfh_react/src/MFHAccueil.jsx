
import { useState } from "react";
import { FaFolderOpen, FaBoxes, FaUsers, FaUserTie, FaBuilding, FaChartPie } from "react-icons/fa";
import LotPage from "./LotPage";
// import NotairePage from "./NotairePage";
// import CommercialPage from "./CommercialPage";
import ClientPage from "./ClientPage";
import { Card, PageHeader } from "./ui-kit";

const menu = [
  { key: "dossier", label: "Dossier", icon: <FaFolderOpen /> },
  { key: "lots", label: "Lots", icon: <FaBoxes /> },
  { key: "clients", label: "Clients", icon: <FaUsers /> },
  // { key: "notaire", label: "Notaire", icon: <FaUserTie /> },
  // { key: "commercial", label: "Commercial", icon: <FaBuilding /> },
  { key: "synthese", label: "Synthèse", icon: <FaChartPie /> },
];

export default function MFHAccueil() {
  const [active, setActive] = useState("lots");

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-72 bg-gradient-to-b from-blue-800 via-blue-900 to-blue-950 text-white shadow-2xl flex flex-col min-h-screen">
        <div className="flex items-center gap-3 text-3xl font-extrabold p-7 border-b border-blue-900 tracking-tight">
          <FaChartPie className="text-blue-200" />
          MFH
        </div>
        <nav className="flex-1 py-6">
          {menu.map((item) => (
            <button
              key={item.key}
              className={`w-full flex items-center gap-4 px-8 py-3 text-lg font-medium rounded-l-full transition-all duration-150 mb-1
                ${active === item.key ? "bg-blue-600 shadow text-white" : "hover:bg-blue-700/80 text-blue-100"}`}
              onClick={() => setActive(item.key)}
            >
              <span className="text-2xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-5 text-xs text-blue-300 border-t border-blue-900">© 2026 MFH</div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen bg-gray-50 px-10 py-12">
        <div className="max-w-6xl mx-auto">
          <PageHeader
            title={
              active === "lots" ? "Gestion des Lots" :
              // active === "notaire" ? "Gestion des Notaires" :
              // active === "commercial" ? "Gestion des Commerciaux" :
              active === "clients" ? "Gestion des Clients" :
              active === "dossier" ? "Gestion des Dossiers" :
              active === "synthese" ? "Synthèse" : "MFH"
            }
          />
          <div className="mt-6">
            {active === "lots" && <Card><LotPage /></Card>}
            {/* {active === "notaire" && <Card><NotairePage /></Card>} */}
            {/* {active === "commercial" && <Card><CommercialPage /></Card>} */}
            {active === "clients" && <Card><ClientPage /></Card>}
            {active === "dossier" && (
              <Card>
                <h2 className="text-2xl font-bold text-blue-700 mb-4">Gestion des dossiers</h2>
                <div className="text-gray-500">Page dossier (à compléter)</div>
              </Card>
            )}
            {active === "synthese" && (
              <Card>
                <h2 className="text-2xl font-bold text-blue-700 mb-4">Synthèse</h2>
                <div className="text-gray-500">Page synthèse (à compléter)</div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
