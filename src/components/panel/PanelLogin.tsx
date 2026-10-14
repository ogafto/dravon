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
      <p>
        {configured
          ? "Zaloguj się, aby zarządzać sklepem."
          : "Pierwsze uruchomienie – ustaw hasło do panelu (min. 10 znaków). Zapamiętaj je!"}
      </p>
      <label className="pnl-field">
        <span>{configured ? "Hasło" : "Nowe hasło"}</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete={configured ? "current-password" : "new-password"}
        />
      </label>
      {error && <p className="pnl-error">{error}</p>}
      <button className="btn btn-primary btn-block" disabled={busy || !password}>
        {busy ? "Chwila…" : configured ? "Zaloguj" : "Ustaw hasło i wejdź"}
      </button>
    </form>
  );
}
