// ConfigRowControl.tsx
// Action mode, execution mode, timing, and skip empty selectors
// for the sentence-style ConfigRow.

import { ConfigRowDropdown, type ConfigRowDropdownOption } from "./ConfigRowDropdown";
import { ConfigRowLabel } from "./ConfigRowLabel";

export type ActionMode = "archive" | "delete";
export type ExecutionMode = "magically" | "manually";
export type Timing = "now" | "later";
export type SkipEmpty = "skip" | "allow";

const ACTION_MODE_OPTIONS: ConfigRowDropdownOption[] = [
  { value: "archive", label: "archiving", description: "Move to trash, recoverable for 30 days" },
  { value: "delete", label: "deleting", description: "Permanently remove with no recovery" },
];

const EXECUTION_MODE_OPTIONS: ConfigRowDropdownOption[] = [
  { value: "magically", label: "automatically", description: "Auto-detect & remove duplicates automatically" },
  { value: "manually", label: "manually", description: "Review duplicates before removing", disabled: true },
];

const TIMING_OPTIONS: ConfigRowDropdownOption[] = [
  { value: "now", label: "now", description: "Execute immediately without preview" },
  { value: "later", label: "later", description: "Show preview first, then confirm action" },
];

const SKIP_EMPTY_OPTIONS: ConfigRowDropdownOption[] = [
  { value: "skip", label: "skipping empty", description: "Ignore pages where the field is blank" },
  { value: "allow", label: "allowing empty", description: "Treat blank values as duplicates of each other" },
];

interface ConfigRowControlProps {
  autoActionMode: ActionMode;
  onActionModeChange: (mode: ActionMode) => void;
  autoExecutionMode: ExecutionMode;
  onExecutionModeChange: (mode: ExecutionMode) => void;
  autoTiming: Timing;
  onTimingChange: (timing: Timing) => void;
  skipEmpty: SkipEmpty;
  onSkipEmptyChange: (value: SkipEmpty) => void;
  isRunning: boolean;
}

export function ConfigRowControl({
  autoActionMode,
  onActionModeChange,
  autoExecutionMode,
  onExecutionModeChange,
  autoTiming,
  onTimingChange,
  skipEmpty,
  onSkipEmptyChange,
  isRunning,
}: ConfigRowControlProps) {
  return (
    <>
      <ConfigRowLabel text="by" />

      <ConfigRowDropdown
        value={autoActionMode}
        onChange={(value) => onActionModeChange(value as ActionMode)}
        options={ACTION_MODE_OPTIONS}
        disabled={isRunning}
        inline
      />

      <ConfigRowDropdown
        value={autoExecutionMode}
        onChange={(value) => onExecutionModeChange(value as ExecutionMode)}
        options={EXECUTION_MODE_OPTIONS}
        disabled={isRunning}
        inline
      />

      <ConfigRowDropdown
        value={autoTiming}
        onChange={(value) => onTimingChange(value as Timing)}
        options={TIMING_OPTIONS}
        disabled={isRunning}
        inline
      />

      <ConfigRowLabel text="," />

      <ConfigRowDropdown
        value={skipEmpty}
        onChange={(value) => onSkipEmptyChange(value as SkipEmpty)}
        options={SKIP_EMPTY_OPTIONS}
        disabled={isRunning}
        inline
      />
    </>
  );
}