import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import {
  FaFolderOpen, FaBoxes, FaUsers, FaUserTie, FaBuilding,
  FaChartPie, FaChartBar, FaBars, FaTimes, FaCog, FaShieldAlt,
  FaArchive, FaFileExport, FaUserShield, FaQuestionCircle, FaTh, FaMobileAlt,
  FaTools,
} from "react-icons/fa";

const SIDEBAR_W = 240;
const HEADER_H  = 56;

const MENU_ALL = [
  {
    roles: ["ADMIN", "DIRECTEUR", "VIEWER"],
    items: [
      { path: "/dossiers", label: "Dossier",  icon: <FaFolderOpen /> },
      { path: "/lots",     label: "Lots",      icon: <FaBoxes />      },
      { path: "/synthese", label: "Synthèse",  icon: <FaChartBar />   },
    ],
  },
  {
    roles: ["ADMIN", "DIRECTEUR", "VIEWER"],
    items: [
      { path: "/lots-kanban", label: "Mise En Option", icon: <FaTh />        },
      { path: "/lots-mobile", label: "Mobile",          icon: <FaMobileAlt /> },
    ],
  },
  {
    roles: ["COMMERCIAL"],
    items: [
      { path: "/lots-mobile", label: "Mobile", icon: <FaMobileAlt /> },
    ],
  },
  {
    group: "Configuration",
    roles: ["ADMIN", "DIRECTEUR", "VIEWER"],
    icon: <FaCog />,
    items: [
      { path: "/clients",    label: "Clients",    icon: <FaUsers />    },
      { path: "/notaire",    label: "Notaire",    icon: <FaUserTie />  },
      { path: "/commercial", label: "Commercial", icon: <FaBuilding /> },
    ],
  },
  {
    group: "Administration",
    roles: ["ADMIN", "DIRECTEUR"],
    icon: <FaShieldAlt />,
    items: [
      { path: "/export",       label: "Export",       icon: <FaFileExport /> },
      { path: "/utilisateurs", label: "Utilisateurs", icon: <FaUserShield /> },
    ],
  },
  {
    roles: ["ADMIN"],
    items: [
      { path: import.meta.env.VITE_DJANGO_ADMIN_URL || "http://127.0.0.1:8000/admin/", label: "Admin MFH", icon: <FaTools />, external: true },
    ],
  },
];

// Liste plate pour usePageTitle (tous rôles confondus)
const allItems = MENU_ALL.flatMap(g => g.items);

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

function usePageTitle() {
  const { pathname } = useLocation();
  const item = allItems.find(m => m.path === pathname);
  return item ? item.label : "MFH";
}

function NavGroup({ group, icon, items, defaultOpen = false }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const { pathname } = useLocation();
  const hasActive = items.some(i => i.path === pathname);

  return (
    <div>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "8px 20px", background: "transparent", border: "none",
          color: hasActive ? "white" : "#93c5fd", cursor: "pointer",
          fontSize: 12, fontWeight: 700, letterSpacing: 1,
          textTransform: "uppercase", marginTop: 6,
        }}
      >
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ flex: 1, textAlign: "left" }}>{group}</span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && items.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          style={({ isActive }) => ({
            display: "flex", alignItems: "center", gap: 12,
            padding: "9px 20px 9px 36px",
            color: isActive ? "white" : "#bfdbfe",
            background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
            fontWeight: isActive ? 600 : 400,
            fontSize: 14,
            textDecoration: "none",
            borderRadius: "0 24px 24px 0",
            marginRight: 12, marginBottom: 1,
            transition: "background 0.15s",
          })}
        >
          <span style={{ fontSize: 15 }}>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
}

export default function Layout({ user, onLogout }) {
  const { role } = useAuth();
  const menu = MENU_ALL.filter(g => !g.roles || g.roles.includes(role));
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(!isMobile);
  const title = usePageTitle();

  // Close sidebar on mobile when navigating
  const location = useLocation();
  useEffect(() => {
    if (isMobile) setOpen(false);
  }, [location.pathname, isMobile]);

  // On resize: auto-open when going desktop, auto-close when going mobile
  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  const overlay = isMobile && open;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* Overlay backdrop on mobile */}
      {overlay && (
        <div onClick={() => setOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          zIndex: 150, cursor: "pointer",
        }} />
      )}

      {/* Sidebar */}
      <aside style={{
        width: SIDEBAR_W,
        minWidth: SIDEBAR_W,
        position: "fixed",
        left: open ? 0 : -SIDEBAR_W,
        top: 0,
        bottom: 0,
        background: "linear-gradient(to bottom, #1e3a8a, #1e40af, #1d4ed8)",
        display: "flex",
        flexDirection: "column",
        zIndex: 200,
        boxShadow: "2px 0 8px rgba(0,0,0,0.15)",
        transition: "left 0.3s ease",
      }}>
        {/* Logo + close */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px", height: HEADER_H,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          color: "white", fontWeight: 800, fontSize: 22,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FaChartPie style={{ color: "#93c5fd" }} />
            MFH
          </div>
          <button onClick={() => setOpen(false)} style={{
            background: "transparent", border: "none", color: "#93c5fd",
            cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0,
          }}>
            <FaTimes />
          </button>
        </div>

        <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
          {menu.map((section, si) =>
            section.group ? (
              <NavGroup
                key={section.group}
                group={section.group}
                icon={section.icon}
                items={section.items}
                defaultOpen={true}
              />
            ) : (
              <div key={si}>
                {section.items.map(item => item.external ? (
                  <button
                    key={item.path}
                    onClick={() => { window.location.href = item.path; }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 20px", width: "100%",
                      color: "#fbbf24", background: "transparent",
                      border: "none", cursor: "pointer",
                      fontWeight: 600, fontSize: 15,
                      borderRadius: "0 24px 24px 0",
                      marginRight: 12, marginBottom: 2,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ) : (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    style={({ isActive }) => ({
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 20px",
                      color: isActive ? "white" : "#bfdbfe",
                      background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                      fontWeight: isActive ? 600 : 400,
                      fontSize: 15,
                      textDecoration: "none",
                      borderRadius: "0 24px 24px 0",
                      marginRight: 12, marginBottom: 2,
                      transition: "background 0.15s",
                    })}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
                <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", margin: "8px 0" }} />
              </div>
            )
          )}
        </nav>

        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 700, fontSize: 12, flexShrink: 0,
          }}>
            {(user?.fullname || user?.username || "?")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "white", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.fullname || user?.username}
            </div>
            <div style={{ fontSize: 10, color: "#93c5fd" }}>© 2026 MFH</div>
          </div>
        </div>
      </aside>

      {/* Right column */}
      <div style={{
        marginLeft: !isMobile && open ? SIDEBAR_W : 0,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        transition: "margin-left 0.3s ease",
        minHeight: "100vh",
        minWidth: 0,
      }}>
        {/* Header */}
        <header style={{
          position: "sticky", top: 0, zIndex: 100,
          height: HEADER_H,
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          display: "flex", alignItems: "center",
          padding: "0 16px",
          gap: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          flexShrink: 0,
        }}>
          <button onClick={() => setOpen(o => !o)} style={{
            background: "transparent", border: "none",
            color: "#6b7280", cursor: "pointer", fontSize: 20,
            display: "flex", alignItems: "center", padding: 6,
            borderRadius: 6, flexShrink: 0,
          }}>
            <FaBars />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            <span style={{ width: 3, height: 22, background: "#2563eb", borderRadius: 2, display: "inline-block", flexShrink: 0 }} />
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1e3a8a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {title}
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {!isMobile && (
              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                {new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
              </span>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, #1e40af, #3b82f6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: 700, fontSize: 14, flexShrink: 0,
              }}>
                {(user?.fullname || user?.username || "?")[0].toUpperCase()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                  {user?.fullname || user?.username}
                </span>
                {user?.role && (
                  <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {user.role}
                  </span>
                )}
              </div>
              <button onClick={onLogout} title="Se déconnecter" style={{
                background: "transparent", border: "1px solid #e5e7eb",
                borderRadius: 6, padding: "4px 10px", fontSize: 12,
                color: "#6b7280", cursor: "pointer", fontWeight: 600, marginLeft: 4,
              }}>
                Déconnexion
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main style={{
          flex: 1,
          overflowY: "auto",
          background: "#f9fafb",
          padding: isMobile ? "16px" : "32px 40px",
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
