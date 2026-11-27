import { useEffect, useRef, useState } from "react";
import {
  CheckSquareOffset,
  Gauge,
  Folders,
  QrCode,
  List,
  SignOut,
  UserList,
  Users,
  X,
} from "@phosphor-icons/react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import committeeProfile from "@/assets/committee-profile.png";
import adminProfile from "@/assets/admin-profile.png";

import {
  clearAdminSession,
  getAdminToken,
  getAdminUser,
} from "@/lib/admin-session";
import { logoutAdmin } from "@/services/admin-dashboard-service";
import {
  clearCommitteeSession,
  getCommitteeToken,
  getCommitteeUser,
} from "@/lib/committee-session";
import { COMMITTEE_COURSES_CHANGED, listCommitteeCourses, logoutCommittee } from "@/services/committee-service";

type AdminSection =
  "dashboard" | "overview" | "votes" | "voters" | "sections" | "candidates" | "partylists" | "voting-qr";

interface NavigationItem {
  id: string;
  label: string;
  icon: typeof Gauge;
  path: string;
  course?: string;
}
interface NavigationGroup {label: string; items: NavigationItem[]}

interface AdminSidebarProps {
  active: AdminSection;
  overview?: boolean;
  portal?: "admin" | "committee";
}

const adminNavigationGroups: NavigationGroup[] = [
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
      {
        id: "partylists",
        label: "Partylists",
        icon: Users,
        path: "/admin/partylists",
      },
      {
        id: "candidates",
        label: "Candidates",
        icon: UserList,
        path: "/admin/candidates",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        id: "voting-qr",
        label: "Voting QR",
        icon: QrCode,
        path: "/admin/voting-qr",
      },
    ],
  },
];

export function AdminSidebar({
  active,
  overview = false,
  portal = "admin",
}: AdminSidebarProps) {
  const committee = portal === "committee";
  const {pathname} = useLocation();
  const [params] = useSearchParams();
  const [courses, setCourses] = useState<string[]>([]);
  const [courseError, setCourseError] = useState("");
  const [coursesLoading, setCoursesLoading] = useState(true);
  const navigationGroups = committee
    ? [
      {label: "Committee", items: [{id: "overview", label: "Overview", icon: Gauge, path: "/committee/dashboard"}]},
      {label: "Courses", items: courses.map((course) => ({id: `course:${course}`, label: course, icon: Folders, path: `/committee/sections?course=${encodeURIComponent(course)}`, course}))},
    ] satisfies NavigationGroup[]
    : adminNavigationGroups;
  const navigationLabel = committee
    ? "Committee navigation"
    : "Admin navigation";
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const admin = committee ? getCommitteeUser() : getAdminUser();

  useEffect(() => {
    const token = getCommitteeToken();
    if (!committee || !token) return;
    const controller = new AbortController();
    let inFlight = false;
    let refreshQueued = false;
    async function refreshCourses() {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await listCommitteeCourses(token!, controller.signal);
        if (!controller.signal.aborted) {setCourses(response.data); setCourseError("");}
      } catch {
        if (!controller.signal.aborted) setCourseError("Courses are temporarily unavailable.");
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) setCoursesLoading(false);
        if (refreshQueued && !controller.signal.aborted) {
          refreshQueued = false;
          void refreshCourses();
        }
      }
    }
    const refresh = () => {if (!document.hidden) void refreshCourses();};
    const coursesChanged = () => {
      if (inFlight) refreshQueued = true;
      else void refreshCourses();
    };
    void refreshCourses();
    window.addEventListener(COMMITTEE_COURSES_CHANGED, coursesChanged);
    window.addEventListener("focus", refresh);
    return () => {controller.abort(); window.removeEventListener(COMMITTEE_COURSES_CHANGED, coursesChanged); window.removeEventListener("focus", refresh);};
  }, [committee, pathname]);

  useEffect(() => {
    if (!overview || !menuOpen) return;
    const sidebar = sidebarRef.current;
    const content = sidebar
      ?.closest("main")
      ?.querySelector<HTMLElement>(".portal-content");
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
    if (committee) {
      const token = getCommitteeToken();
      if (token) await logoutCommittee(token).catch(() => undefined);
      clearCommitteeSession();
      navigate("/committee/login", { replace: true });
      return;
    }
    const token = getAdminToken();
    if (token) await logoutAdmin(token).catch(() => undefined);
    clearAdminSession();
    navigate("/admin/login", { replace: true });
  }

  function handleNavigation(
    item: NavigationItem,
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
        aria-label={overview && menuOpen ? navigationLabel : undefined}
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
          aria-label={navigationLabel}
          className="admin-dashboard__navigation"
        >
          {navigationGroups.map((group) => (
            <div className="admin-dashboard__nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = "course" in item && item.course
                  ? active === "sections" && params.get("course") === item.course
                  : item.id === active;
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
          {committee && coursesLoading && <p className="committee-course-status" role="status">Loading courses…</p>}
          {committee && courseError && <div className="committee-course-status" role="status"><p>{courseError}</p><button type="button" onClick={() => window.dispatchEvent(new Event(COMMITTEE_COURSES_CHANGED))}>Try again</button></div>}
          {committee && !coursesLoading && !courseError && courses.length === 0 && <p className="committee-course-status">No courses yet. Add a section from Overview.</p>}
        </nav>
        <div className="admin-dashboard__account">
          <div>
            <span>
              <img
                className="admin-dashboard__account-photo"
                src={committee ? committeeProfile : adminProfile}
                alt=""
                width={36}
                height={36}
              />
            </span>
            <p title={admin?.name}>
              <strong>
                {committee ? "Committee" : (admin?.name ?? "CPC Admin")}
              </strong>
              <small>{committee ? "Class records" : "Administrator"}</small>
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
