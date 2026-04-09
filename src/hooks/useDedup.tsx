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

function saveState(state: DedupState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable
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
    if (typeof window === "undefined") return { ...initialState };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.isActive) {
          // If it was running, restore as paused (since the stream is gone)
          if (parsed.phase === "running") {
            parsed.phase = "paused";
          }
          return parsed as DedupState;
        }
      }
    } catch {
      // Ignore
    }
    return { ...initialState };
  });

  const pausedRef = useRef(false);

  // Persist state changes
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
