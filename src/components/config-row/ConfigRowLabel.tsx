// ConfigRowLabel.tsx
// Static text label rendered inline within the sentence-style ConfigRow.

interface ConfigRowLabelProps {
  text: string;
}

export function ConfigRowLabel({ text }: ConfigRowLabelProps) {
  return <span className="db-config-text">{text}</span>;
}