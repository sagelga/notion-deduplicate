// Card.tsx
//
// Atomic card container component.
//
// Variants:
//   default  — subtle bg, standard border
//   elevated — adds box shadow for depth
//   split    — left border accent, for keep/delete panels
//
// Sub-elements:
//   CardHeader — header row with title
//   CardBody   — content area
//   CardFooter — bottom actions
//
// Usage:
//   <Card variant="elevated">
//     <CardHeader>
//       <CardTitle>Card Title</CardTitle>
//     </CardHeader>
//     <CardBody>
//       <p>Card content goes here</p>
//     </CardBody>
//     <CardFooter>
//       <Button variant="primary">Save</Button>
//     </CardFooter>
//   </Card>

"use client";

import styles from "./Card.module.css";

export type CardVariant = "default" | "elevated" | "split";

export interface CardProps {
  /** Visual style variant */
  variant?: CardVariant;
  /** Card content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return (
    <div className={[styles["card-header"], className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: CardTitleProps) {
  return (
    <h3 className={[styles["card-title"], className].filter(Boolean).join(" ")}>
      {children}
    </h3>
  );
}

export function CardBody({ children, className = "" }: CardBodyProps) {
  return (
    <div className={[styles["card-body"], className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div className={[styles["card-footer"], className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export default function Card({
  variant = "default",
  children,
  className = "",
}: CardProps) {
  const classes = [
    styles.card,
    variant !== "default" ? styles[`card--${variant}`] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}
