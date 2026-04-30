// Button.tsx
//
// Atomic button component with multiple variants and sizes.
//
// Variants:
//   default  — border, subtle bg, hover state (most common)
//   primary  — solid accent background
//   secondary — transparent bg, visible border
//   ghost    — fully transparent
//   danger   — red background
//   cancel   — muted text only
//
// Sizes:
//   default | sm
//
// Usage:
//   <Button variant="primary" size="sm" onClick={handleClick}>
//     Save
//   </Button>

"use client";

import { forwardRef } from "react";
import styles from "./Button.module.css";

export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "cancel";

export type ButtonSize = "default" | "sm";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size variant */
  size?: ButtonSize;
  /** Additional CSS class */
  className?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "default",
      size = "default",
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
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
