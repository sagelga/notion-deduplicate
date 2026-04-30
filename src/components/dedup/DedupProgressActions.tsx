// DedupProgressActions.tsx
// Action buttons in the expanded bottom sheet.

import Link from "next/link";
import { Button } from "../ui";
import { usePathname } from "next/navigation";
import type { Phase } from "./dedup-types";

interface DedupProgressActionsProps {
  phase: Phase;
  pausedRef: React.MutableRefObject<boolean>;
  setPhase: (phase: Phase) => void;
  dismissDedup: () => void;
}

export function DedupProgressActions({
  phase,
  pausedRef,
  setPhase,
  dismissDedup,
}: DedupProgressActionsProps) {
  const pathname = usePathname();
  const isOnDedupPage =
    pathname === "/duplicate" || (pathname?.startsWith("/duplicate/") ?? false);

  return (
    <div className="dedup-sheet-actions">
      {(phase === "running" || phase === "paused") && (
        <Button
          variant="secondary"
          onClick={() => {
            pausedRef.current = !pausedRef.current;
            setPhase(pausedRef.current ? "paused" : "running");
          }}
        >
          {phase === "paused" ? "Resume" : "Pause"}
        </Button>
      )}
      {!isOnDedupPage && (
        <Link href="/duplicate" className="dedup-act-btn dedup-act-btn--primary">
          View progress
        </Link>
      )}
      {(phase === "done" || phase === "error") && (
        <Button variant="ghost" onClick={dismissDedup}>
          Dismiss
        </Button>
      )}
    </div>
  );
}