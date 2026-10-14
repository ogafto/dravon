"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="death">
      <div className="death__inner">
        <h1>Creeper wybuchł!</h1>
        <p className="death__score">
          Coś poszło nie tak po naszej stronie{error.digest ? ` · ${error.digest}` : ""}
        </p>
        <p>Spróbuj ponownie za chwilę. Jeśli problem się powtarza, daj nam znać na Discordzie.</p>
        <div className="death__actions">
          <button type="button" className="btn btn-stone btn-lg" onClick={reset}>
            Spróbuj ponownie
          </button>
          <Link href="/" className="btn btn-stone btn-lg">
            Strona główna
          </Link>
        </div>
      </div>
    </section>
  );
}
