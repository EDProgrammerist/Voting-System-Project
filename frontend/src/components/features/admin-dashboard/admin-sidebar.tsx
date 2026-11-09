import { useEffect, useRef, useState } from "react";
import {
  CheckSquareOffset,
  Gauge,
  List,
  SignOut,
  UserList,
  Users,
  X,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router";

import {
  clearAdminSession,
  getAdminToken,
  getAdminUser,
} from "@/lib/admin-session";
import { logoutAdmin } from "@/services/admin-dashboard-service";

type AdminSection = "dashboard" | "votes" | "voters" | "candidates";

interface AdminSidebarProps {
  active: AdminSection;
  overview?: boolean;
}

const navigationGroups = [
  {
    label: "Reports",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: Gauge,
        path: "/admin/dashboard",
      },
      {
        id: "votes",
        label: "Votes",
        icon: CheckSquareOffset,
        path: "/admin/votes",
      },
    ],
  },
  {
    label: "Manage",
    items: [
      { id: "voters", label: "Voters", icon: Users, path: "/admin/voters" },
      {
        id: "candidates",
        label: "Candidates",
        icon: UserList,
        path: "/admin/candidates",
      },
    ],
  },
];

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");
}

export function AdminSidebar({ active, overview = false }: AdminSidebarProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const admin = getAdminUser();

  useEffect(() => {
    if (!overview || !menuOpen) return;
    const sidebar = sidebarRef.current;
    const content = sidebar
      ?.closest("main")
      ?.querySelector<HTMLElement>(".admin-dashboard__content");
    if (!sidebar || !content) return;
    const previousOverflow = document.body.style.overflow;
    const previousInert = content.inert;
    content.inert = true;
    document.body.style.overflow = "hidden";
    const toggle = toggleRef.current;
    sidebar.querySelector<HTMLButtonElement>("button")?.focus();
    const media = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (media.matches) setMenuOpen(false);
    };
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
      }
      if (event.key !== "Tab") return;
      const buttons = sidebar!.querySelectorAll<HTMLButtonElement>("button");
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    media.addEventListener("change", closeOnDesktop);
    return () => {
      content.inert = previousInert;
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      media.removeEventListener("change", closeOnDesktop);
      if (toggle?.isConnected && !media.matches) toggle.focus();
    };
  }, [overview, menuOpen]);

  async function handleLogout() {
    const token = getAdminToken();
    if (token) await logoutAdmin(token).catch(() => undefined);
    clearAdminSession();
    navigate("/admin/login", { replace: true });
  }

  function handleNavigation(
    item: (typeof navigationGroups)[number]["items"][number],
  ) {
    setMenuOpen(false);
    navigate(item.path);
  }

  return (
    <>
      <button
        ref={toggleRef}
        aria-controls="admin-navigation"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        className="admin-dashboard__menu-toggle"
        onClick={() => setMenuOpen((current) => !current)}
        type="button"
      >
        {menuOpen ? <X aria-hidden="true" /> : <List aria-hidden="true" />}
      </button>

      <aside
        ref={sidebarRef}
        role={overview && menuOpen ? "dialog" : undefined}
        aria-modal={overview && menuOpen ? true : undefined}
        aria-label={overview && menuOpen ? "Admin navigation" : undefined}
        className="admin-dashboard__sidebar"
        data-open={menuOpen}
        id="admin-navigation"
      >
        {overview && menuOpen && (
          <button
            className="overview-navigation-close"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        )}
        <div className="admin-dashboard__brand" aria-label="CPC Vote">
          <span>CPC</span>
          <strong>Vote</strong>
        </div>
        <nav
          aria-label="Admin navigation"
          className="admin-dashboard__navigation"
        >
          {navigationGroups.map((group) => (
            <div className="admin-dashboard__nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === active;
                return (
                  <button
                    aria-current={isActive ? "page" : undefined}
                    className="admin-dashboard__nav-item"
                    data-active={isActive}
                    key={item.label}
                    onClick={() => handleNavigation(item)}
                    type="button"
                  >
                    <Icon
                      aria-hidden="true"
                      weight={isActive ? "fill" : "regular"}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="admin-dashboard__account">
          <div>
            <span>{admin ? initials(admin.name) : "AD"}</span>
            <p>
              <strong>{admin?.name ?? "CPC Admin"}</strong>
              <small>Administrator</small>
            </p>
          </div>
          <button aria-label="Log out" onClick={handleLogout} type="button">
            <SignOut aria-hidden="true" />
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button
          aria-label="Close navigation"
          className="admin-dashboard__backdrop"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}
    </>
  );
}
