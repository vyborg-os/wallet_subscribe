"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";

export default function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);

  // Build cumulative paths for each segment
  const crumbs = parts.map((part, idx) => {
    const href = "/" + parts.slice(0, idx + 1).join("/");
    const label = decodeURIComponent(part.replace(/-/g, " "));
    return { href, label };
  });

  return (
    <nav aria-label="Breadcrumb" className="">
      <div className="container py-2 overflow-x-auto">
        <ol className="flex items-center gap-2 text-sm whitespace-nowrap">
          <li>
            <Link href="/" className="inline-flex items-center gap-1 text-white/70 hover:text-white px-2 py-1 rounded-lg">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </li>
          {crumbs.map((c, i) => (
            <li key={c.href} className="flex items-center gap-2">
              <span className="text-white/30">/</span>
              {i < crumbs.length - 1 ? (
                <Link href={c.href} className="px-2 py-1 rounded-lg text-white/70 hover:text-white capitalize">
                  {c.label}
                </Link>
              ) : (
                <span className="px-2 py-1 rounded-lg text-white capitalize">{c.label}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
