"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
};

const clinicLinks: NavLink[] = [
  { href: "/", label: "Dashboard" },
  { href: "/patients", label: "Patients" },
  { href: "/appointments", label: "Appointments" },
  { href: "/medical-records", label: "Medical Records" },
  { href: "/billing", label: "Billing" },
  { href: "/lab-results", label: "Lab Results" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
  { href: "/admin", label: "Admin" },
];

const portalLinks: NavLink[] = [
  { href: "/patient-portal", label: "Patient Portal" },
  { href: "/patient-portal/login", label: "Portal Login" },
  { href: "/patient-portal/appointments", label: "Portal Appointments" },
  { href: "/patient-portal/lab-results", label: "Portal Labs" },
  { href: "/patient-portal/messages", label: "Portal Messages" },
];

function linkClass(href: string, pathname: string): string {
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return isActive ? "nav-link nav-link-active" : "nav-link";
}

export function MainNav() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="topbar-title-wrap">
        <h1 className="topbar-title">MedFlow AI11</h1>
        <p className="topbar-subtitle">Cloud EHR and patient operations workspace</p>
      </div>

      <nav className="nav-wrap" aria-label="Primary navigation">
        <div className="nav-group">
          {clinicLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href, pathname)}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="nav-group nav-group-muted">
          {portalLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href, pathname)}>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
