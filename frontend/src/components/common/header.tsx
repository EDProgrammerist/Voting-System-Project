import { NavLink } from "react-router";

import logo from "@/assets/logo.svg";
import type { NavigationItem } from "@/types/navigation";

const NAV_LINKS: NavigationItem[] = [{ label: "Home", to: "/" }];

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <NavLink className="flex items-center gap-3" to="/">
          <img alt="" className="size-10" src={logo} />
          <span className="text-base font-bold tracking-tight text-slate-950">
            Student Voting System
          </span>
        </NavLink>

        <nav aria-label="Primary navigation">
          <ul className="flex items-center gap-6">
            {NAV_LINKS.map((item) => (
              <li key={item.to}>
                <NavLink
                  className={({ isActive }) =>
                    isActive
                      ? "text-sm font-semibold text-blue-700"
                      : "text-sm font-medium text-slate-600 hover:text-slate-950"
                  }
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

