// Button.tsx
//
// Atomic button component with multiple variants and sizes.
//
// Variants:
//   default    — border, subtle bg, hover state (most common)
//   primary    — solid accent background
//   secondary  — transparent bg, visible border
//   ghost      — fully transparent
//   danger     — red background
//   cancel     — muted text only
//   notion     — opens external link (hover changes border to accent)
//   danger-outlined — danger color outline (for delete actions)
//
// Sizes:
//   default | sm | lg
//
// Props:
//   block      — fills available width (flex: 1)
//   align      — "left" | "right" alignment (uses margin-left: auto for right)
//   hoverBorder — hover changes border color instead of background
//   icon       — React node placed before text (icon + text layout)
//
// Usage:
//   <Button variant="primary" size="sm" onClick={handleClick}>
//     Save
//   </Button>
//   <Button variant="primary" size="lg" block>
//     Full Width
//   </Button>
//   <Button variant="notion" icon={<ExternalLink size={14} />}>
//     Open in Notion
//   </Button>
//   <Button variant="primary" align="right">Right Aligned</Button>

"use client";

import { forwardRef } from "react";
import styles from "./Button.module.css";

export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "cancel"
  | "notion"
  | "danger-outlined";

export type ButtonSize = "default" | "sm" | "lg";

export type ButtonAlign = "left" | "right";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size variant */
  size?: ButtonSize;
  /** Fill available width */
  block?: boolean;
  /** Horizontal alignment */
  align?: ButtonAlign;
  /** Hover changes border color instead of background */
  hoverBorder?: boolean;
  /** Icon placed before text */
  icon?: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "default",
      size = "default",
      block = false,
      align = "left",
      hoverBorder = false,
      icon,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const classes = [
      styles.btn,
      variant !== "default" ? styles[`btn--${variant}`] : "",
      size !== "default" ? styles[`btn--${size}`] : "",
      block ? styles["btn--block"] : "",
      align === "right" ? styles["btn--right"] : "",
      hoverBorder ? styles["btn--hover-border"] : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button ref={ref} className={classes} {...props}>
        {icon && <span className={styles["btn-icon"]}>{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
