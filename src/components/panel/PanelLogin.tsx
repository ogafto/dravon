"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PanelLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/panel/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { status?: string; message?: string } | null;
    setBusy(false);
    if (data?.status === "success") router.refresh();
    else setError(data?.message ?? "Brak połączenia. Spróbuj ponownie.");
  }

  return (
    <form className="pnl-login panel" onSubmit={submit}>
      <h1>Panel sklepu</h1>
      {configured ? (
        <>
          <p>Zaloguj się, aby zarządzać produktami i zobaczyć zakupy.</p>
          <label className="pnl-field">
            <span>Hasło</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="current-password" />
          </label>
          {error && <p className="pnl-error">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy || !password}>
            {busy ? "Logowanie…" : "Zaloguj"}
          </button>
        </>
      ) : (
        <p className="pnl-error">
          Panel nie ma jeszcze hasła. Ustaw zmienną <b>ADMIN_PASSWORD</b> na hostingu strony i wdróż ją ponownie.
        </p>
      )}
    </form>
  );
}
