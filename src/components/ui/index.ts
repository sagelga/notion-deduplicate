// index.ts — barrel export for atomic UI components
//
// Usage:
//   import { Button, Badge, Tag, Spinner, Kbd } from '@/components/ui'
//   import Input, { Toggle, Card, ProgressBar } from '@/components/ui'
//
// Individual imports also work:
//   import Button from '@/components/ui/Button'
//   import Badge from '@/components/ui/Badge'

// ── Buttons ──────────────────────────────────────────────────────
export { default as Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize, ButtonAlign } from "./Button";

// ── Badges ───────────────────────────────────────────────────────
export { default as Badge } from "./Badge";
export type { BadgeProps, BadgeVariant } from "./Badge";

// ── Tags ─────────────────────────────────────────────────────────
export { default as Tag } from "./Tag";
export type { TagProps, TagVariant } from "./Tag";

// ── Keyboard hints ───────────────────────────────────────────────
export { default as Kbd } from "./Kbd";
export type { KbdProps } from "./Kbd";

// ── Spinners ─────────────────────────────────────────────────────
export { default as Spinner } from "./Spinner";
export type { SpinnerProps, SpinnerSize, SpinnerVariant } from "./Spinner";

// ── Form inputs ──────────────────────────────────────────────────
export { default as Input } from "./Input";
export type { InputProps, InputVariant } from "./Input";

// ── Toggles ──────────────────────────────────────────────────────
export { default as Toggle } from "./Toggle";
export type { ToggleProps, ToggleSize } from "./Toggle";

// ── Cards ────────────────────────────────────────────────────────
export { default as Card, CardHeader, CardTitle, CardBody, CardFooter } from "./Card";
export type { CardProps, CardVariant, CardHeaderProps, CardTitleProps, CardBodyProps, CardFooterProps } from "./Card";

// ── Progress bars ────────────────────────────────────────────────
export { default as ProgressBar } from "./ProgressBar";
export type { ProgressBarProps, ProgressVariant, ProgressSize, ProgressState } from "./ProgressBar";

// ── Sync button ────────────────────────────────────────────────
export { default as SyncButton } from "./SyncButton";
export type { SyncButtonProps } from "./SyncButton";

// ── Carousel ──────────────────────────────────────────────────────
export { default as Carousel } from "./Carousel";
export type { CarouselStep } from "./Carousel";

// Re-export BottomSheet and Notification which existed before
export { default as BottomSheet } from "./BottomSheet";
// BottomSheetProps is defined inline in BottomSheet.tsx - re-export here
export type { BottomSheetProps } from "./BottomSheet";

export { default as Notification } from "./Notification";
export type { NotificationProps, NotificationVariant, NotificationAction } from "./Notification";
