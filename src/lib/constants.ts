// constants.ts
//
// Global magic-number constants used across multiple modules.
// Each constant has a JSDoc explanation of its purpose and rationale.
// Centralizing them makes the codebase easier to search and modify.

/** Maximum wait time in ms for a single retry attempt (capped exponential back-off: 1s → 2s → 4s … → 64s). */
export const MAX_RETRY_WAIT_MS = 64_000;

/** Rate at which the adaptive Notion API delay decays after each successful request (25% decay per batch). */
export const RATE_LIMIT_DECAY = 0.75;

/** Default number of days in each direction (past/future) fetched for the "today" and "upcoming" views. */
export const DEFAULT_WINDOW_DAYS = 14;