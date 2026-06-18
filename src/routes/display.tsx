import { createFileRoute, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DEFAULT_DISPLAYS, displayLabel } from "@/lib/presentation-types";

export const Route = createFileRoute("/display")({
  head: () => ({
    meta: [{ title: "Display — Selecionar Monitor" }],
  }),
  component: DisplayLayout,
});

function DisplayLayout() {
  const hasChild = useRouterState({
    select: (s) => s.matches.some((m) => m.routeId === "/display/$id"),
  });
  if (hasChild) return <Outlet />;
  return <DisplaySelect />;
}

function DisplaySelect() {
  const navigate = useNavigate();
  const [custom, setCustom] = useState("");
  const [last, setLast] = useState<string | null>(null);

  useEffect(() => {
    setLast(localStorage.getItem("stage:lastDisplay"));
  }, []);

  function go(id: string) {
    if (!id) return;
    const clean = id.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!clean) return;
    if (typeof window !== "undefined") localStorage.setItem("stage:lastDisplay", clean);
    navigate({ to: "/display/$id", params: { id: clean } });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="mb-3 text-xs tracking-[0.22em] text-muted-foreground">STAGE · DISPLAY</div>
      <h1 className="text-balance text-center text-3xl font-semibold tracking-tight sm:text-5xl">
        Identifique este monitor
      </h1>
      <p className="mt-4 max-w-md text-center text-sm text-muted-foreground">
        Escolha o identificador desta tela. O controle saberá enviar o conteúdo para o monitor correto.
      </p>

      <div className="mt-12 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
        {DEFAULT_DISPLAYS.map((id) => (
          <button
            key={id}
            onClick={() => go(id)}
            className="group relative rounded-2xl border border-border bg-surface px-6 py-10 text-center transition hover:bg-surface-elevated"
          >
            <div className="text-xs tracking-[0.2em] text-muted-foreground">{id.toUpperCase()}</div>
            <div className="mt-3 text-xl font-medium">{displayLabel(id)}</div>
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(custom);
        }}
        className="mt-8 flex w-full max-w-md gap-2"
      >
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Identificador personalizado (ex: lobby)"
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/30"
        />
        <button
          type="submit"
          className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Abrir
        </button>
      </form>

      {last && (
        <button
          onClick={() => go(last)}
          className="mt-6 text-xs tracking-[0.18em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          USAR ÚLTIMO: {last.toUpperCase()}
        </button>
      )}
    </div>
  );
}
