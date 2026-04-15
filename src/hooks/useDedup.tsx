// useDedup.tsx
//
// Global React context that owns the deduplication session lifecycle.
//
// Why a context (not local state)?
//   The dedup operation is long-running and survives page navigation. Storing
//   state here (backed by localStorage) means the progress bar in the navbar
//   and the detail view in AutoDeduplicateView always see the same data.
//
// Key design decisions:
//   - localStorage persistence: lets the user refresh without losing progress.
//   - pausedRef (a mutable ref, not state): pause/resume must be readable by
//     the streaming fetch loop without causing re-renders on every tick.
//   - On reload mid-run, phase is forced to "paused" because the stream is
//     gone and can't be resumed automatically.

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type DedupPhase = "running" | "paused" | "done" | "error" | "preview";
export type DedupMode = "archive" | "delete";

export interface DedupStats {
  scanned: number;
  duplicatesFound: number;
  actioned: number;
  errors: number;
}

export interface DedupState {
  isActive: boolean;
  phase: DedupPhase;
  mode: DedupMode;
  databaseId: string;
  databaseName: string;
  fieldName: string;
  stats: DedupStats;
  errorMessage: string;
}

interface DedupContextType extends DedupState {
  startDedup: (params: {
    databaseId: string;
    databaseName: string;
    fieldName: string;
    mode: DedupMode;
  }) => void;
  updateStats: (stats: DedupStats) => void;
  setPhase: (phase: DedupPhase) => void;
  setErrorMessage: (msg: string) => void;
  stopDedup: () => void;
  dismissDedup: () => void;
  // Ref that components can use to signal pause/resume to the worker
  pausedRef: React.MutableRefObject<boolean>;
}

// Key used to persist DedupState in localStorage across navigations/refreshes.
const STORAGE_KEY = "dedup:state";

const initialState: DedupState = {
  isActive: false,
  phase: "running",
  mode: "archive",
  databaseId: "",
  databaseName: "",
  fieldName: "",
  stats: { scanned: 0, duplicatesFound: 0, actioned: 0, errors: 0 },
  errorMessage: "",
};

// Only writes when running in a browser — guards against SSR/edge execution
// where window is undefined.
function saveState(state: DedupState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — non-fatal; state will be lost on refresh.
  }
}

function clearState() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

const DedupContext = createContext<DedupContextType | undefined>(undefined);

export const DedupProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<DedupState>(() => {
    // Lazy initialiser runs once at mount time to hydrate from localStorage.
    if (typeof window === "undefined") return { ...initialState };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Only restore state if the session was active — skip stale cleared state.
        if (parsed?.isActive) {
          // If it was running, restore as paused (since the stream is gone)
          if (parsed.phase === "running") {
            parsed.phase = "paused";
          }
          return parsed as DedupState;
        }
      }
    } catch {
      // Corrupted JSON — fall through to initialState.
    }
    return { ...initialState };
  });

  // Mutable ref shared with AutoDeduplicateView. Reading/writing it does not
  // trigger re-renders, which is intentional — the stream loop polls this ref
  // on every NDJSON event without causing React to flush a new render cycle.
  const pausedRef = useRef(false);

  // Only persist when a session is active to avoid writing stale cleared state.
  useEffect(() => {
    if (state.isActive) {
      saveState(state);
    }
  }, [state]);

  const startDedup = useCallback(
    (params: {
      databaseId: string;
      databaseName: string;
      fieldName: string;
      mode: DedupMode;
    }) => {
      pausedRef.current = false;
      setState({
        isActive: true,
        phase: "running",
        mode: params.mode,
        databaseId: params.databaseId,
        databaseName: params.databaseName,
        fieldName: params.fieldName,
        stats: { scanned: 0, duplicatesFound: 0, actioned: 0, errors: 0 },
        errorMessage: "",
      });
    },
    []
  );

  const updateStats = useCallback((stats: DedupStats) => {
    setState((prev) => ({ ...prev, stats }));
  }, []);

  const setPhase = useCallback((phase: DedupPhase) => {
    setState((prev) => ({ ...prev, phase }));
  }, []);

  // Setting an error message always transitions phase to "error" so callers
  // don't have to call setPhase separately.
  const setErrorMessage = useCallback((errorMessage: string) => {
    setState((prev) => ({ ...prev, errorMessage, phase: "error" }));
  }, []);

  const stopDedup = useCallback(() => {
    pausedRef.current = false;
    clearState();
    setState({ ...initialState });
  }, []);

  const dismissDedup = useCallback(() => {
    pausedRef.current = false;
    clearState();
    setState({ ...initialState });
  }, []);

  return (
    <DedupContext.Provider
      value={{
        ...state,
        startDedup,
        updateStats,
        setPhase,
        setErrorMessage,
        stopDedup,
        dismissDedup,
        pausedRef,
      }}
    >
      {children}
    </DedupContext.Provider>
  );
};

export const useDedup = (): DedupContextType => {
  const ctx = useContext(DedupContext);
  if (!ctx)
    throw new Error("useDedup must be used within a DedupProvider");
  return ctx;
};
