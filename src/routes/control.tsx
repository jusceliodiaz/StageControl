import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIES,
  DEFAULT_DISPLAYS,
  displayLabel,
  isOnline,
  ONLINE_THRESHOLD_MS,
  type DisplayRow,
  type MediaItem,
  type SceneRow,
} from "@/lib/presentation-types";
import { uploadPresentationFile } from "@/lib/upload";
import {
  Activity,
  Check,
  ChevronRight,
  Copy,
  Film,
  Image as ImageIcon,
  Layers,
  Plus,
  QrCode,
  Radio,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/control")({
  head: () => ({
    meta: [{ title: "Controle — Stage" }],
  }),
  component: ControlPanel,
});

function ControlPanel() {
  const [displays, setDisplays] = useState<DisplayRow[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [scenes, setScenes] = useState<SceneRow[]>([]);
  const [activeTarget, setActiveTarget] = useState<string>("center");
  const [category, setCategory] = useState<string>("Todas");
  const [tick, setTick] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [showSceneEditor, setShowSceneEditor] = useState(false);
  const [editingScene, setEditingScene] = useState<SceneRow | null>(null);
  const [pingSentAt, setPingSentAt] = useState<Record<string, number>>({});

  // tick every 5s to refresh "online" indicators
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const refreshAll = useCallback(async () => {
    const [d, m, s] = await Promise.all([
      supabase.from("displays").select("*").order("id"),
      supabase.from("media_items").select("*").order("created_at", { ascending: false }),
      supabase.from("scenes").select("*").order("created_at", { ascending: false }),
    ]);
    setDisplays((d.data as DisplayRow[]) ?? []);
    setMedia((m.data as MediaItem[]) ?? []);
    setScenes((s.data as SceneRow[]) ?? []);
  }, []);

  useEffect(() => {
    refreshAll();

    const channel = supabase
      .channel("control-room")
      .on("postgres_changes", { event: "*", schema: "public", table: "displays" }, () => {
        supabase
          .from("displays")
          .select("*")
          .order("id")
          .then(({ data }) => setDisplays((data as DisplayRow[]) ?? []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "media_items" }, () => {
        supabase
          .from("media_items")
          .select("*")
          .order("created_at", { ascending: false })
          .then(({ data }) => setMedia((data as MediaItem[]) ?? []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "scenes" }, () => {
        supabase
          .from("scenes")
          .select("*")
          .order("created_at", { ascending: false })
          .then(({ data }) => setScenes((data as SceneRow[]) ?? []));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshAll]);

  // ensure default display rows exist
  useEffect(() => {
    if (displays.length === 0) return;
    const ids = new Set(displays.map((d) => d.id));
    const missing = DEFAULT_DISPLAYS.filter((id) => !ids.has(id));
    if (missing.length) {
      supabase.from("displays").upsert(missing.map((id) => ({ id })), { onConflict: "id" });
    }
  }, [displays]);

  const mediaById = useMemo(() => {
    const map = new Map<string, MediaItem>();
    media.forEach((m) => map.set(m.id, m));
    return map;
  }, [media]);

  const visibleMedia = useMemo(() => {
    if (category === "Todas") return media;
    return media.filter((m) => m.category === category);
  }, [media, category]);

  const sortedDisplays = useMemo(() => {
    const order = new Map<string, number>(DEFAULT_DISPLAYS.map((d, i) => [d, i] as [string, number]));
    return [...displays].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
  }, [displays]);

  async function sendToDisplay(displayId: string, mediaId: string | null) {
    await supabase
      .from("displays")
      .upsert(
        { id: displayId, current_media_id: mediaId, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    if (mediaId) {
      const m = mediaById.get(mediaId);
      toast(`${m?.title ?? "Mídia"} → ${displayLabel(displayId)}`);
    } else {
      toast(`${displayLabel(displayId)} limpo`);
    }
  }

  async function applyScene(scene: SceneRow) {
    const updates = Object.entries(scene.assignments).map(([disp, mediaId]) =>
      supabase
        .from("displays")
        .upsert(
          { id: disp, current_media_id: mediaId, updated_at: new Date().toISOString() },
          { onConflict: "id" },
        ),
    );
    await Promise.all(updates);
    toast(`Cena "${scene.name}" aplicada`);
  }

  async function pingDisplay(displayId: string) {
    const now = Date.now();
    setPingSentAt((prev) => ({ ...prev, [displayId]: now }));
    await supabase.from("displays").update({ ping_requested_at: new Date().toISOString() }).eq("id", displayId);
    toast(`Ping enviado para ${displayLabel(displayId)}`);
  }

  const onlineCount = sortedDisplays.filter((d) => isOnline(d.last_seen_at)).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-4 sm:px-10">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background">
              <span className="text-sm font-bold tracking-tighter">S</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-medium">Stage Controle</div>
              <div className="text-[11px] tracking-[0.18em] text-muted-foreground">
                {onlineCount} DE {sortedDisplays.length} ONLINE
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
              <span className="live-dot inline-block h-2 w-2 rounded-full bg-live" />
              <span className="text-[11px] font-medium tracking-[0.18em] text-foreground">AO VIVO</span>
            </div>
            <button
              onClick={() => {
                setEditingScene(null);
                setShowSceneEditor(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium transition hover:bg-surface-elevated"
            >
              <Layers className="h-3.5 w-3.5" /> Nova cena
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
            >
              <Upload className="h-3.5 w-3.5" /> Upload
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-10 px-6 py-8 sm:px-10 sm:py-10">
        {/* Monitores */}
        <section>
          <SectionLabel>Monitores</SectionLabel>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {sortedDisplays.map((d) => (
              <MonitorCard
                key={d.id}
                display={d}
                media={d.current_media_id ? mediaById.get(d.current_media_id) ?? null : null}
                active={activeTarget === d.id}
                tick={tick}
                onSelect={() => setActiveTarget(d.id)}
                onClear={() => sendToDisplay(d.id, null)}
              />
            ))}
          </div>
        </section>

        {/* Diagnóstico de Rede */}
        <DiagnosticSection
          sortedDisplays={sortedDisplays}
          pingSentAt={pingSentAt}
          setPingSentAt={setPingSentAt}
          pingDisplay={pingDisplay}
        />

        {/* Cenas */}
        <section>
          <div className="flex items-end justify-between">
            <SectionLabel>Cenas</SectionLabel>
            <button
              onClick={() => {
                setEditingScene(null);
                setShowSceneEditor(true);
              }}
              className="text-xs tracking-[0.18em] text-muted-foreground hover:text-foreground"
            >
              + CRIAR CENA
            </button>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {scenes.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-8 text-sm text-muted-foreground">
                Nenhuma cena criada. Crie uma cena para enviar conteúdo a todos os monitores ao mesmo tempo.
              </div>
            )}
            {scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                mediaById={mediaById}
                onApply={() => applyScene(scene)}
                onEdit={() => {
                  setEditingScene(scene);
                  setShowSceneEditor(true);
                }}
              />
            ))}
          </div>
        </section>

        {/* Biblioteca */}
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionLabel>Biblioteca</SectionLabel>
            <div className="text-[11px] tracking-[0.18em] text-muted-foreground">
              ENVIANDO PARA · <span className="text-foreground">{displayLabel(activeTarget).toUpperCase()}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(["Todas", ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  category === c
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {visibleMedia.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center text-sm text-muted-foreground">
              Nenhuma mídia nesta categoria. Faça upload de vídeos ou imagens.
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visibleMedia.map((m) => (
                <MediaCard
                  key={m.id}
                  media={m}
                  onSend={() => sendToDisplay(activeTarget, m.id)}
                  onDelete={async () => {
                    if (!confirm(`Remover "${m.title}"?`)) return;
                    await supabase.from("media_items").delete().eq("id", m.id);
                    toast("Mídia removida");
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {showUpload && <UploadDrawer onClose={() => setShowUpload(false)} />}
      {showSceneEditor && (
        <SceneEditorDrawer
          scene={editingScene}
          displays={sortedDisplays}
          media={media}
          onClose={() => setShowSceneEditor(false)}
        />
      )}
    </div>
  );
}

function DiagnosticSection({
  sortedDisplays,
  pingSentAt,
  setPingSentAt,
  pingDisplay,
}: {
  sortedDisplays: DisplayRow[];
  pingSentAt: Record<string, number>;
  setPingSentAt: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  pingDisplay: (id: string) => Promise<void>;
}) {
  const [qrOpen, setQrOpen] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <section>
      <div className="flex items-end justify-between">
        <SectionLabel>Diagnóstico de Rede</SectionLabel>
        <button
          onClick={async () => {
            const now = new Date().toISOString();
            const t = Date.now();
            const ids = sortedDisplays.map((d) => d.id);
            setPingSentAt((prev) => {
              const next = { ...prev };
              ids.forEach((id) => (next[id] = t));
              return next;
            });
            await Promise.all(
              ids.map((id) =>
                supabase.from("displays").update({ ping_requested_at: now }).eq("id", id),
              ),
            );
            toast("Ping enviado para todos os monitores");
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium transition hover:bg-surface-elevated"
        >
          <Activity className="h-3.5 w-3.5" /> Pingar todos
        </button>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {sortedDisplays.map((d) => {
          const online = isOnline(d.last_seen_at);
          const sent = pingSentAt[d.id];
          const displayUrl = `${origin}/display/${d.id}`;
          let pingResult = "";
          if (sent && d.ping_requested_at) {
            const lastSeen = d.last_seen_at ? new Date(d.last_seen_at).getTime() : 0;
            const responded = lastSeen >= new Date(d.ping_requested_at).getTime();
            if (responded) {
              const rtt = Math.max(0, lastSeen - sent);
              pingResult = `Respondido em ~${rtt}ms`;
            } else if (Date.now() - sent < 8000) {
              pingResult = "Aguardando…";
            } else {
              pingResult = "Sem resposta";
            }
          }
          return (
            <div key={d.id} className="rounded-2xl border border-border bg-surface">
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${online ? "bg-online" : "bg-offline"}`}
                  />
                  <div>
                    <div className="text-sm font-medium">{displayLabel(d.id)}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {online
                        ? `Online · visto ${formatRelative(new Date(d.last_seen_at!))}`
                        : d.last_seen_at
                          ? `Offline · visto ${formatRelative(new Date(d.last_seen_at))}`
                          : "Nunca conectado"}
                    </div>
                    {pingResult && (
                      <div className="mt-0.5 text-[11px] font-medium text-primary">{pingResult}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => pingDisplay(d.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium tracking-[0.14em] transition hover:bg-surface-elevated"
                >
                  <Radio className="h-3 w-3" /> PING
                </button>
              </div>

              {/* URL + QR row */}
              <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2">
                <code className="flex-1 truncate rounded-md bg-surface-elevated px-2 py-1 text-[11px] text-muted-foreground">
                  {displayUrl}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(displayUrl);
                    toast(`URL copiada: ${displayLabel(d.id)}`);
                  }}
                  title="Copiar URL"
                  className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:bg-surface-elevated hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setQrOpen(qrOpen === d.id ? null : d.id)}
                  title="QR Code"
                  className={`rounded-lg border border-border p-1.5 transition hover:bg-surface-elevated hover:text-foreground ${
                    qrOpen === d.id ? "bg-surface-elevated text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5" />
                </button>
              </div>

              {qrOpen === d.id && (
                <div className="flex flex-col items-center gap-2 px-4 pb-4 pt-1">
                  <div className="rounded-xl bg-white p-3">
                    <QRCodeSVG value={displayUrl} size={160} level="M" />
                  </div>
                  <p className="text-center text-[11px] text-muted-foreground">
                    Aponte a câmera do monitor para abrir <strong>{displayLabel(d.id)}</strong>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground">
      {String(children).toUpperCase()}
    </h2>
  );
}

function MonitorCard({
  display,
  media,
  active,
  tick,
  onSelect,
  onClear,
}: {
  display: DisplayRow;
  media: MediaItem | null;
  active: boolean;
  tick: number;
  onSelect: () => void;
  onClear: () => void;
}) {
  void tick;
  const online = isOnline(display.last_seen_at);
  const lastSeen = display.last_seen_at
    ? formatRelative(new Date(display.last_seen_at))
    : "nunca";

  return (
    <button
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-2xl border bg-surface text-left transition ${
        active ? "border-foreground/60 ring-1 ring-foreground/30" : "border-border hover:border-foreground/30"
      }`}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {media?.cover_url ? (
          <img src={media.cover_url} alt={media.title} className="h-full w-full object-cover" />
        ) : media?.image_url ? (
          <img src={media.image_url} alt={media.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs tracking-[0.22em] text-white/30">
            SEM CONTEÚDO
          </div>
        )}
        {active && (
          <div className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-foreground text-background">
            <Check className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 shrink-0 rounded-full ${online ? "bg-online" : "bg-offline"}`}
              aria-hidden
            />
            <span className="truncate text-sm font-medium">{displayLabel(display.id)}</span>
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {media ? media.title : online ? "Aguardando conteúdo" : `Visto ${lastSeen}`}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] tracking-[0.18em] text-muted-foreground transition hover:text-foreground"
        >
          LIMPAR
        </button>
      </div>
    </button>
  );
}

function MediaCard({
  media,
  onSend,
  onDelete,
}: {
  media: MediaItem;
  onSend: () => void;
  onDelete: () => void;
}) {
  const cover = media.cover_url || media.image_url;
  const isVideo = !!media.video_url;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-foreground/30">
      <button onClick={onSend} className="block w-full text-left">
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          {cover ? (
            <img src={cover} alt={media.title} className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
          ) : (
            <div className="grid h-full w-full place-items-center text-white/30">
              {isVideo ? <Film className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
            </div>
          )}
          <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] tracking-[0.18em] text-white/80 backdrop-blur">
            {isVideo ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
            {isVideo ? "VÍDEO" : "IMAGEM"}
          </div>
          <div className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black">
              <Zap className="h-3.5 w-3.5" /> Enviar
            </div>
          </div>
        </div>
        <div className="p-3">
          <div className="truncate text-sm font-medium">{media.title}</div>
          <div className="mt-0.5 text-[11px] tracking-[0.14em] text-muted-foreground">
            {media.category.toUpperCase()}
          </div>
        </div>
      </button>
      <button
        onClick={onDelete}
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white/70 opacity-0 backdrop-blur transition hover:text-white group-hover:opacity-100"
        aria-label="Remover"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SceneCard({
  scene,
  mediaById,
  onApply,
  onEdit,
}: {
  scene: SceneRow;
  mediaById: Map<string, MediaItem>;
  onApply: () => void;
  onEdit: () => void;
}) {
  const entries = Object.entries(scene.assignments);
  return (
    <div className="group relative w-72 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-foreground/30">
      <button onClick={onApply} className="block w-full text-left">
        <div className="grid grid-cols-3 gap-px bg-border/40">
          {(entries.length ? entries : DEFAULT_DISPLAYS.map((d) => [d, null] as const)).map(([disp, mid]) => {
            const m = mid ? mediaById.get(mid as string) : null;
            const cover = m?.cover_url || m?.image_url;
            return (
              <div key={disp} className="aspect-square bg-black">
                {cover ? (
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between p-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{scene.name}</div>
            <div className="text-[11px] tracking-[0.14em] text-muted-foreground">CENA</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
      </button>
      <button
        onClick={onEdit}
        className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] tracking-[0.18em] text-white/80 opacity-0 backdrop-blur transition hover:text-white group-hover:opacity-100"
      >
        EDITAR
      </button>
    </div>
  );
}

function UploadDrawer({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !mediaFile) {
      toast.error("Informe um título e selecione um arquivo");
      return;
    }
    setBusy(true);
    try {
      const isVideo = mediaFile.type.startsWith("video/");
      const main = await uploadPresentationFile(mediaFile, isVideo ? "videos" : "images");
      let coverUrl: string | null = null;
      if (coverFile) {
        const c = await uploadPresentationFile(coverFile, "covers");
        coverUrl = c.url;
      } else if (!isVideo) {
        coverUrl = main.url;
      }
      const { error } = await supabase.from("media_items").insert({
        title: title.trim(),
        category,
        cover_url: coverUrl,
        video_url: isVideo ? main.url : null,
        image_url: isVideo ? null : main.url,
      });
      if (error) throw error;
      toast.success("Mídia enviada");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Falha ao enviar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer onClose={onClose} title="Nova mídia">
      <form onSubmit={submit} className="space-y-5">
        <Field label="Título">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Vídeo Fachada"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-foreground/30"
          />
        </Field>
        <Field label="Categoria">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  category === c
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface text-muted-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Arquivo (MP4, JPG, PNG, WEBP)">
          <FileInput
            accept="video/mp4,image/jpeg,image/png,image/webp"
            file={mediaFile}
            onChange={setMediaFile}
          />
        </Field>
        <Field label="Imagem de capa (opcional — usada como miniatura)">
          <FileInput
            accept="image/jpeg,image/png,image/webp"
            file={coverFile}
            onChange={setCoverFile}
          />
        </Field>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Enviando…" : "Salvar"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

function SceneEditorDrawer({
  scene,
  displays,
  media,
  onClose,
}: {
  scene: SceneRow | null;
  displays: DisplayRow[];
  media: MediaItem[];
  onClose: () => void;
}) {
  const [name, setName] = useState(scene?.name ?? "");
  const [assignments, setAssignments] = useState<Record<string, string | null>>(
    scene?.assignments ?? Object.fromEntries(displays.map((d) => [d.id, null])),
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Dê um nome à cena");
      return;
    }
    setBusy(true);
    try {
      if (scene) {
        await supabase.from("scenes").update({ name: name.trim(), assignments }).eq("id", scene.id);
      } else {
        await supabase.from("scenes").insert({ name: name.trim(), assignments });
      }
      toast.success("Cena salva");
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!scene) return;
    if (!confirm(`Remover cena "${scene.name}"?`)) return;
    await supabase.from("scenes").delete().eq("id", scene.id);
    toast("Cena removida");
    onClose();
  }

  return (
    <Drawer onClose={onClose} title={scene ? "Editar cena" : "Nova cena"} wide>
      <div className="space-y-5">
        <Field label="Nome da cena">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Rooftop"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-foreground/30"
          />
        </Field>

        <div className="space-y-4">
          {displays.map((d) => {
            const selectedId = assignments[d.id] ?? null;
            return (
              <div key={d.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-medium">{displayLabel(d.id)}</div>
                  {selectedId && (
                    <button
                      onClick={() => setAssignments((a) => ({ ...a, [d.id]: null }))}
                      className="text-[11px] tracking-[0.18em] text-muted-foreground hover:text-foreground"
                    >
                      LIMPAR
                    </button>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {media.length === 0 && (
                    <div className="text-xs text-muted-foreground">Nenhuma mídia disponível.</div>
                  )}
                  {media.map((m) => {
                    const cover = m.cover_url || m.image_url;
                    const active = selectedId === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setAssignments((a) => ({ ...a, [d.id]: m.id }))}
                        className={`relative w-32 shrink-0 overflow-hidden rounded-xl border text-left ${
                          active ? "border-foreground" : "border-border"
                        }`}
                      >
                        <div className="aspect-video bg-black">
                          {cover ? (
                            <img src={cover} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="truncate p-2 text-[11px]">{m.title}</div>
                        {active && (
                          <div className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 pt-2">
          {scene && (
            <button
              type="button"
              onClick={remove}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Salvando…" : "Salvar cena"}
          </button>
        </div>
      </div>
    </Drawer>
  );
}

function Drawer({
  children,
  onClose,
  title,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="flex-1 bg-black/60 backdrop-blur-sm"
      />
      <div
        className={`flex h-full flex-col overflow-hidden border-l border-border bg-background shadow-2xl ${
          wide ? "w-full max-w-2xl" : "w-full max-w-md"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-base font-medium">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-surface">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-[11px] tracking-[0.18em] text-muted-foreground">{label.toUpperCase()}</div>
      {children}
    </label>
  );
}

function FileInput({
  accept,
  file,
  onChange,
}: {
  accept: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-surface px-4 py-4 text-sm transition hover:border-foreground/30">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-elevated">
          {file ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <div className="truncate">{file ? file.name : "Selecionar arquivo"}</div>
          {file && (
            <div className="text-[11px] text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </div>
          )}
        </div>
      </div>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

function formatRelative(date: Date) {
  const diff = Date.now() - date.getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}min atrás`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h atrás`;
  return date.toLocaleDateString("pt-BR");
}

// keep noUnusedLocals happy
void ONLINE_THRESHOLD_MS;
