"use client";

import { useState } from "react";
import styles from "./Carousel.module.css";

export interface CarouselStep {
  description: React.ReactNode;
  image?: string;
  critical?: boolean;
}

interface CarouselProps {
  steps: CarouselStep[];
}

export default function Carousel({ steps }: CarouselProps) {
  const [current, setCurrent] = useState(0);
  const step = steps[current];
  const total = steps.length;
  const progressPct = ((current + 1) / total) * 100;

  return (
    <div className={styles.carousel}>
      {step.image && (
        <div className={styles.imageContainer}>
          <img src={step.image} alt={`Step ${current + 1}`} className={styles.image} />
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.stepBadge}>Step {current + 1} of {total}</span>
          {step.critical && <span className={styles.criticalBadge}>Required</span>}
        </div>
        <div className={styles.descriptionArea}>
          {steps.map((s, i) => (
            <p
              key={i}
              className={`${styles.description} ${i !== current ? styles.hidden : ""}`}
            >
              {s.description}
            </p>
          ))}
        </div>
      </div>

      <div className={styles.navigation}>
        <button
          className={styles.navBtn}
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          aria-label="Previous step"
        >
          ←
        </button>
        <div className={styles.dots}>
          {steps.map((_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${i === current ? styles.active : ""}`}
              onClick={() => setCurrent(i)}
              role="button"
              tabIndex={0}
              aria-label={`Go to step ${i + 1}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setCurrent(i);
              }}
            />
          ))}
        </div>
        <button
          className={styles.navBtn}
          onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
          disabled={current === total - 1}
          aria-label="Next step"
        >
          →
        </button>
      </div>
    </div>
  );
}
