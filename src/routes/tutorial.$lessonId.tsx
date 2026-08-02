import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";

import { CardInspectModal } from "@/components/game/CardInspectModal";
import { RealmShell } from "@/components/game/RealmShell";
import { TutorialBoardView } from "@/components/tutorial/TutorialBoardView";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CardDefinition } from "@/game-data/schema";
import { usePlayerData } from "@/hooks/use-player-data";
import {
  getLesson,
  nextLessonId,
  type TutorialBoard,
  type TutorialTarget,
} from "@/tutorial/script";

export const Route = createFileRoute("/tutorial/$lessonId")({
  loader: ({ params }) => {
    const lesson = getLesson(params.lessonId);
    if (!lesson) throw notFound();
    return { lessonId: params.lessonId };
  },
  head: ({ params }) => {
    const lesson = getLesson(params.lessonId);
    const title = lesson ? `${lesson.title} — Realmforge Tutorial` : "Realmforge Tutorial";
    const description = lesson
      ? `${lesson.teaches} A short guided Realmforge QuickPlay lesson on a scripted board.`
      : "A short guided Realmforge QuickPlay lesson.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: LessonRunner,
  errorComponent: ({ error }) => <p role="alert" className="p-6">{error.message}</p>,
  notFoundComponent: () => <p className="p-6">That tutorial lesson does not exist.</p>,
});

function LessonRunner() {
  const { lessonId } = Route.useParams();
  const lesson = getLesson(lessonId)!;
  const { data, completeLesson } = usePlayerData();

  const [stepIndex, setStepIndex] = useState(0);
  const [boardState, setBoardState] = useState<TutorialBoard>(lesson.initial);
  const [hint, setHint] = useState<string | null>(null);
  const [inspected, setInspected] = useState<CardDefinition | null>(null);
  const [finished, setFinished] = useState(false);

  const step = finished ? null : (lesson.steps[stepIndex] ?? null);
  const nextId = useMemo(() => nextLessonId(lessonId), [lessonId]);
  const alreadyDone = data.tutorial.completedLessonIds.includes(lessonId);

  const restart = useCallback(() => {
    setStepIndex(0);
    setBoardState(lesson.initial);
    setHint(null);
    setFinished(false);
  }, [lesson]);

  const act = useCallback(
    (target: TutorialTarget, id?: string) => {
      const current = lesson.steps[stepIndex];
      if (!current || finished) return;
      if (current.target !== target) return;
      if (current.requireId !== undefined && current.requireId !== id) {
        setHint(current.wrongTargetHint ?? "That is not the target this step is asking for.");
        return;
      }
      setHint(null);
      setBoardState((b) => current.apply(b));
      if (stepIndex + 1 >= lesson.steps.length) {
        setFinished(true);
        completeLesson(lessonId);
      } else {
        setStepIndex(stepIndex + 1);
      }
    },
    [completeLesson, finished, lesson, lessonId, stepIndex],
  );

  return (
    <RealmShell
      backTo="/tutorial"
      backLabel="Tutorial library"
      eyebrow={lesson.kind === "core" ? `Core lesson ${lesson.order} of 11` : "Mini-lesson"}
      title={lesson.title}
      description={lesson.teaches}
      wide
      actions={
        <div className="flex items-center gap-2">
          {alreadyDone && <Badge variant="secondary">Completed</Badge>}
          <Button variant="outline" size="sm" onClick={restart}>
            Restart lesson
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <TutorialBoardView
          boardState={boardState}
          step={step}
          onAct={act}
          onInspect={setInspected}
        />

        <aside className="space-y-3">
          <section className="rounded-xl border border-oath-gold/50 bg-oath-blue-deep/60 p-4">
            <p className="text-[0.65rem] tracking-widest text-oath-cyan uppercase">
              {finished ? "Lesson complete" : `Step ${stepIndex + 1} of ${lesson.steps.length}`}
            </p>
            <p className="mt-2 text-sm">
              {finished ? lesson.takeaway : step?.instruction}
            </p>
            {hint && (
              <p role="alert" className="mt-2 text-sm text-realm-danger">
                {hint}
              </p>
            )}
          </section>

          {finished && (
            <Alert className="border-oath-cyan/60">
              <AlertTitle>Nice work</AlertTitle>
              <AlertDescription className="space-y-2">
                <span>Progress is saved on this device.</span>
                <span className="flex flex-wrap gap-2 pt-1">
                  {nextId && (
                    <Button asChild size="sm">
                      <Link to="/tutorial/$lessonId" params={{ lessonId: nextId }}>
                        Next lesson
                      </Link>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline">
                    <Link to="/tutorial">Back to library</Link>
                  </Button>
                </span>
              </AlertDescription>
            </Alert>
          )}

          <section className="rounded-xl border border-border/70 bg-card/60 p-4">
            <h2 className="text-[0.65rem] tracking-widest text-muted-foreground uppercase">
              What happened
            </h2>
            <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
              {boardState.log.length === 0 && <li>Nothing yet.</li>}
              {boardState.log.map((line, index) => (
                <li key={index}>• {line}</li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      <CardInspectModal
        card={inspected}
        open={inspected !== null}
        onOpenChange={(open) => !open && setInspected(null)}
      />
    </RealmShell>
  );
}
