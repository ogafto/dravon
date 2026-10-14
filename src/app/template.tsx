/** Montowany na nowo przy każdej zmianie podstrony – daje spójne wejście każdej strony. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
