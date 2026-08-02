import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  GraduationCap,
  Database,
  Library,
  Medal,
  BarChart3,
  Settings as SettingsIcon,
  Shield,
  Swords,
  UserRound,
  Wrench,
} from "lucide-react";

import { RealmShell } from "@/components/game/RealmShell";
import { InstallRealmforge } from "@/components/pwa/InstallRealmforge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Main Menu — Realmforge" },
      {
        name: "description",
        content: "Choose a Realmforge mode, review your collection, or adjust accessibility settings.",
      },
      { property: "og:title", content: "Main Menu — Realmforge" },
      { property: "og:description", content: "Choose a mode, review decks, or adjust settings." },
    ],
  }),
  component: MainMenu,
  errorComponent: ({ error }) => <p role="alert" className="p-6">{error.message}</p>,
});

const ITEMS = [
  { to: "/modes", label: "Play", detail: "Cooperative raid or Oathguard Trials", icon: Swords, primary: true },
  { to: "/tutorial", label: "Tutorial", detail: "Eleven guided lessons plus keyword mini-lessons", icon: GraduationCap, primary: true },
  { to: "/learn", label: "Learn to Play", detail: "QuickPlay turn structure in four steps", icon: BookOpen, primary: false },
  { to: "/collection", label: "Collection", detail: "Every card from the source databases", icon: Library, primary: false },
  { to: "/decks", label: "Decks", detail: "Inspect the six QuickPlay decks", icon: Shield, primary: false },
  { to: "/profile", label: "Profile", detail: "Local progress and match history", icon: UserRound, primary: false },
  { to: "/achievements", label: "Achievements", detail: "Cosmetic-only rewards for playing", icon: Medal, primary: false },
  { to: "/statistics", label: "Statistics", detail: "Results, mastery, and boss victories", icon: BarChart3, primary: false },
  { to: "/data", label: "Data Management", detail: "Export, import, or clear local data", icon: Database, primary: false },
  { to: "/settings", label: "Settings", detail: "Motion, sound, and accessibility", icon: SettingsIcon, primary: false },
  { to: "/dev/content-audit", label: "Content Audit", detail: "Development data verification", icon: Wrench, primary: false },
] as const;

function MainMenu() {
  return (
    <RealmShell
      eyebrow="Realmforge"
      title="Main Menu"
      description="Everything below runs locally. No account is required to play."
      backTo="/"
      backLabel="Title screen"
      actions={<InstallRealmforge />}
    >
      <nav>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "group flex h-full items-start gap-3 rounded-xl border p-4 transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  item.primary
                    ? "border-oath-gold/60 bg-oath-blue-deep/70 hover:border-oath-gold"
                    : "border-border/70 bg-card/60 hover:border-oath-cyan/60",
                )}
              >
                <item.icon className="mt-0.5 size-5 shrink-0 text-oath-cyan" aria-hidden />
                <span className="min-w-0">
                  <span className="block font-display tracking-wide">{item.label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{item.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </RealmShell>
  );
}