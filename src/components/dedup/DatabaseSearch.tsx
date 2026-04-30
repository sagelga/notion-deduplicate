// DatabaseSearch.tsx
//
// Inline search input for filtering the database list.
// Renders above the database list in the ConfigRow dropdown panel.

import { useState, useRef, useEffect } from "react";

interface DatabaseSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DatabaseSearch({ value, onChange, placeholder = "Search…" }: DatabaseSearchProps) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);
    onChange(next);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [localValue, value, onChange]);

  return (
    <div className="db-search-wrapper">
      <input
        ref={inputRef}
        type="text"
        className="db-search-input"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus
      />
    </div>
  );
}