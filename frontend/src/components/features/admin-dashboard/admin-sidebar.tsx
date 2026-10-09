import { useState } from "react";
import { CheckSquareOffset, Gauge, List, ListChecks, Medal, SignOut, UserList, Users, X } from "@phosphor-icons/react";
import { useNavigate } from "react-router";

import { clearAdminSession, getAdminToken, getAdminUser } from "@/lib/admin-session";
import { logoutAdmin } from "@/services/admin-dashboard-service";

type AdminSection = "dashboard" | "votes";

interface AdminSidebarProps {
  active: AdminSection;
  onUnavailable?: (label: string) => void;
}

const navigationGroups = [
  {
    label: "Reports",
    items: [
      { id: "dashboard", label: "Dashboard", icon: Gauge, path: "/admin/dashboard" },
      { id: "votes", label: "Votes", icon: CheckSquareOffset, path: "/admin/votes" },
    ],
  },
  {
    label: "Manage",
    items: [
      { id: "voters", label: "Voters", icon: Users },
      { id: "position", label: "Position", icon: Medal },
      { id: "candidates", label: "Candidates", icon: UserList },
      { id: "ballot", label: "Ballot Position", icon: ListChecks },
    ],
  },
];

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((part) => part.charAt(0)).join("");
}

export function AdminSidebar({ active, onUnavailable }: AdminSidebarProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const admin = getAdminUser();

  async function handleLogout() {
    const token = getAdminToken();
    try {
      if (token) await logoutAdmin(token);
    } finally {
      clearAdminSession();
      navigate("/admin/login", { replace: true });
    }
  }

  function handleNavigation(item: (typeof navigationGroups)[number]["items"][number]) {
    setMenuOpen(false);
    if ("path" in item && item.path) {
      navigate(item.path);
      return;
    }
    onUnavailable?.(item.label);
  }

  return (
    <>
      <button aria-controls="admin-navigation" aria-expanded={menuOpen} aria-label={menuOpen ? "Close navigation" : "Open navigation"} className="admin-dashboard__menu-toggle" onClick={() => setMenuOpen((current) => !current)} type="button">
        {menuOpen ? <X aria-hidden="true" /> : <List aria-hidden="true" />}
      </button>

      <aside className="admin-dashboard__sidebar" data-open={menuOpen} id="admin-navigation">
        <div className="admin-dashboard__brand" aria-label="CPC Vote"><span>CPC</span><strong>Vote</strong></div>
        <nav aria-label="Admin navigation" className="admin-dashboard__navigation">
          {navigationGroups.map((group) => (
            <div className="admin-dashboard__nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === active;
                return (
                  <button aria-current={isActive ? "page" : undefined} className="admin-dashboard__nav-item" data-active={isActive} key={item.label} onClick={() => handleNavigation(item)} type="button">
                    <Icon aria-hidden="true" weight={isActive ? "fill" : "regular"} /><span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="admin-dashboard__account">
          <div><span>{admin ? initials(admin.name) : "AD"}</span><p><strong>{admin?.name ?? "CPC Admin"}</strong><small>Administrator</small></p></div>
          <button aria-label="Log out" onClick={handleLogout} type="button"><SignOut aria-hidden="true" /></button>
        </div>
      </aside>

      {menuOpen && <button aria-label="Close navigation" className="admin-dashboard__backdrop" onClick={() => setMenuOpen(false)} type="button" />}
    </>
  );
}
