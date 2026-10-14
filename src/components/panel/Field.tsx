"use client";

/** Pole formularza panelu z podpisem i podpowiedzią. */
export function Field({
  label,
  hint,
  wide,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`pnl-field ${wide ? "pnl-field--wide" : ""}`}>
      <span>{label}</span>
      {children}
      {hint && <small className="pnl-hint">{hint}</small>}
    </label>
  );
}

export function Message({ message }: { message: { text: string; bad?: boolean } | null }) {
  if (!message) return null;
  return <p className={message.bad ? "pnl-error" : "pnl-note"}>{message.text}</p>;
}
