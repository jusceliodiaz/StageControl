import { createFileRoute, Link } from "@tanstack/react-router";
import { Monitor, Tablet } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stage — Apresentações Imobiliárias" },
      { name: "description", content: "Controle remoto premium para apresentações imobiliárias multi-tela." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_oklch(0.22_0_0)_0%,_oklch(0.13_0_0)_55%)]" />

      <header className="relative z-10 flex items-center justify-between px-8 py-7 sm:px-14">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background">
            <span className="text-sm font-bold tracking-tighter">S</span>
          </div>
          <span className="text-sm font-medium tracking-[0.22em] text-muted-foreground">STAGE</span>
        </div>
        <span className="text-xs tracking-[0.2em] text-muted-foreground">v1.0</span>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs tracking-[0.18em] text-muted-foreground backdrop-blur">
          APRESENTAÇÕES IMOBILIÁRIAS · TEMPO REAL
        </div>
        <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-7xl">
          Comande cada tela
          <br />
          <span className="text-muted-foreground">a partir de um único toque.</span>
        </h1>
        <p className="mt-6 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
          Controle vídeos, imagens e cenas em múltiplos monitores do stand sincronizados instantaneamente.
        </p>

        <div className="mt-12 grid w-full max-w-3xl gap-4 sm:grid-cols-2">
          <Link
            to="/control"
            className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 text-left transition hover:bg-surface-elevated"
          >
            <div className="flex items-center justify-between">
              <Tablet className="h-6 w-6 text-foreground" />
              <span className="text-xs tracking-widest text-muted-foreground">TABLET</span>
            </div>
            <div className="mt-12">
              <h2 className="text-2xl font-medium">Controle</h2>
              <p className="mt-1 text-sm text-muted-foreground">Painel do corretor</p>
            </div>
          </Link>

          <Link
            to="/display"
            className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 text-left transition hover:bg-surface-elevated"
          >
            <div className="flex items-center justify-between">
              <Monitor className="h-6 w-6 text-foreground" />
              <span className="text-xs tracking-widest text-muted-foreground">MONITOR</span>
            </div>
            <div className="mt-12">
              <h2 className="text-2xl font-medium">Display</h2>
              <p className="mt-1 text-sm text-muted-foreground">Tela de exibição</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
