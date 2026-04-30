// Input.tsx
//
// Atomic text input component.
//
// Variants:
//   default — standard text input
//   mono     — monospace font (for tokens, IDs, codes)
//
// States:
//   default, focus, disabled, error
//
// Usage:
//   <Input
//     type="password"
//     placeholder="Enter your token"
//     value={token}
//     onChange={(e) => setToken(e.target.value)}
//   />
//   <Input
//     variant="mono"
//     placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
//     helperText="Found in Notion settings"
//     error="Token is required"
//   />

"use client";

import { forwardRef } from "react";
import styles from "./Input.module.css";

export type InputVariant = "default" | "mono";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Visual style variant */
  variant?: InputVariant;
  /** Error message — shows error styling + message below */
  error?: string;
  /** Helper text shown below input */
  helperText?: string;
  /** Additional CSS class */
  className?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = "default",
      error,
      helperText,
      className = "",
      ...props
    },
    ref
  ) => {
    const inputClasses = [
      styles.input,
      variant === "mono" ? styles["input--mono"] : "",
      error ? styles["input--error"] : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div>
        <input ref={ref} className={inputClasses} {...props} />
        {error && <p className={styles["input-error"]}>{error}</p>}
        {!error && helperText && (
          <p className={styles["input-helper"]}>{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
