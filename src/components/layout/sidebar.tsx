"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/contexts";

const PUBLIC_NAV_ITEMS = [
  { href: "/", label: "all_projects", icon: "⊞" },
  { href: "/tags", label: "tags", icon: "#" },
];

const PRIVATE_NAV_ITEMS = [
  { href: "/health", label: "health_check", icon: "◈" },
  { href: "/settings", label: "settings", icon: "⚙" },
];

interface Category {
  key: string;
  label: string;
  count: number;
}

interface SidebarProps {
  onCategoryChange?: (category: string | null) => void;
  activeCategory?: string | null;
  categories?: Category[];
}

export default function Sidebar({
  onCategoryChange,
  activeCategory,
  categories = [
    { key: "all", label: "all", count: 0 },
    { key: "active", label: "active", count: 0 },
    { key: "learning", label: "learning", count: 0 },
    { key: "research", label: "research", count: 0 },
    { key: "archive", label: "archive", count: 0 },
  ],
}: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const handleCategoryClick = (category: string) => {
    if (onCategoryChange) {
      onCategoryChange(activeCategory === category ? null : category);
    }
  };

  return (
    <aside
      className="flex flex-col gap-6 shrink-0"
      style={{
        width: 240,
        height: "100vh",
        background: "#0c0c0c",
        borderRight: "1px solid #1f1f1f",
        padding: "32px 20px",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span style={{ color: "#22c55e", fontSize: 20, fontWeight: 600 }}>
          ~
        </span>
        <span style={{ color: "#e5e5e5", fontSize: 16, fontWeight: 600 }}>
          devhub
        </span>
        <span style={{ color: "#737373", fontSize: 16 }}>_central</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        <span style={{ color: "#525252", fontSize: 11, marginBottom: 4 }}>
          navigation
        </span>
        {PUBLIC_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 transition-colors"
              style={{
                padding: "8px 12px",
                background: isActive ? "#1a1a1a" : "transparent",
                color: isActive ? "#e5e5e5" : "#737373",
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                textDecoration: "none",
                borderRadius: 0,
              }}
            >
              <span
                style={{
                  width: 14,
                  fontSize: 13,
                  color: isActive ? "#22c55e" : "#525252",
                  fontFamily: "monospace",
                }}
              >
                {isActive ? ">" : item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
        {user &&
          PRIVATE_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 transition-colors"
                style={{
                  padding: "8px 12px",
                  background: isActive ? "#1a1a1a" : "transparent",
                  color: isActive ? "#e5e5e5" : "#737373",
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  textDecoration: "none",
                  borderRadius: 0,
                }}
              >
                <span
                  style={{
                    width: 14,
                    fontSize: 13,
                    color: isActive ? "#22c55e" : "#525252",
                    fontFamily: "monospace",
                  }}
                >
                  {isActive ? ">" : item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
      </nav>

      {/* Categories */}
      <div className="flex flex-col gap-1">
        <span style={{ color: "#525252", fontSize: 11, marginBottom: 4 }}>
          categories
        </span>
        {categories.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => handleCategoryClick(cat.key)}
              className="flex items-center justify-between w-full transition-colors"
              style={{
                padding: "6px 12px",
                background: isActive ? "#1a1a1a" : "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  color: isActive ? "#e5e5e5" : "#737373",
                  fontSize: 12,
                }}
              >
                {cat.label}
              </span>
              <span
                style={{
                  color: isActive ? "#22c55e" : "#525252",
                  fontSize: 11,
                }}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22c55e",
              flexShrink: 0,
            }}
          />
          <span style={{ color: "#a3a3a3", fontSize: 12 }}>toaducz</span>
        </div>
        <span style={{ color: "#525252", fontSize: 11, paddingLeft: 16 }}>
          admin
        </span>
      </div>
    </aside>
  );
}
