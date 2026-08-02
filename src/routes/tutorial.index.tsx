import { Link, createFileRoute } from "@tanstack/react-router";

import { RealmShell } from "@/components/game/RealmShell";
import { Badge } from "@/components/ui/badge";
import { usePlayerData } from "@/hooks/use-player-data";
import { CORE_LESSONS, MINI_LESSONS, type TutorialLesson } from "@/tutorial/script";

export const Route = createFileRoute("/tutorial/")({
  head: () => ({
    meta: [
      { title: "Tutorial Library — Realmforge" },
      {
        name: "description",
        content:
          "Learn Realmforge QuickPlay one action at a time: inspect, charge, pay, play, attack, break the Gate, and defeat the boss.",
      },
      { property: "og:title", content: "Tutorial Library — Realmforge" },
      {
        property: "og:description",
        content: "Eleven guided steps plus optional keyword mini-lessons.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TutorialLibrary,
  errorComponent: ({ error }) => <p role="alert" className="p-6">{error.message}</p>,
});

function LessonRow({ lesson, done }: { lesson: TutorialLesson; done: boolean }) {
  return (
    <li>
      <Link
        to="/tutorial/$lessonId"
        params={{ lessonId: lesson.id }}
        className="flex h-full flex-col rounded-xl border border-border/70 bg-card/60 p-4 transition-colors hover:border-oath-cyan/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-sm">
            {lesson.kind === "core" ? `${lesson.order}. ` : ""}
            {lesson.title}
          </h3>
          <Badge variant={done ? "secondary" : "outline"}>{done ? "✓ Done" : "Start"}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{lesson.teaches}</p>
      </Link>
    </li>
  );
}

function TutorialLibrary() {
  const { data } = usePlayerData();
  const done = new Set(data.tutorial.completedLessonIds);
  const coreDone = CORE_LESSONS.filter((l) => done.has(l.id)).length;

  return (
    <RealmShell
      eyebrow="Tutorial library"
      title="Learn by playing"
      description="Each lesson teaches one action on a scripted board. Nothing is timed and nothing is locked."
      actions={
        <Badge variant="secondary">
          {coreDone}/{CORE_LESSONS.length} core lessons complete
        </Badge>
      }
    >
      <section className="mb-8">
        <h2 className="mb-3 font-display text-xs tracking-widest uppercase">Core path</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CORE_LESSONS.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} done={done.has(lesson.id)} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xs tracking-widest uppercase">
          Optional mini-lessons
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MINI_LESSONS.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} done={done.has(lesson.id)} />
          ))}
        </ul>
      </section>
    </RealmShell>
  );
}
