import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DisplayRow, MediaItem } from "@/lib/presentation-types";
import { displayLabel } from "@/lib/presentation-types";

export const Route = createFileRoute("/display/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Display ${params.id.toUpperCase()} — Stage` }],
  }),
  component: DisplayKiosk,
});

function DisplayKiosk() {
  const { id } = Route.useParams();
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [ready, setReady] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastPingRespondedAt = useRef<number>(0);

  const respondToPing = useCallback(async () => {
    const now = Date.now();
    await supabase
      .from("displays")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", id);
    lastPingRespondedAt.current = now;
  }, [id]);

  // ensure row exists, then track current media + heartbeat
  useEffect(() => {
    let cancelled = false;

    async function loadMediaFor(mediaId: string | null) {
      if (!mediaId) {
        if (!cancelled) setMedia(null);
        return;
      }
      const { data } = await supabase
        .from("media_items")
        .select("*")
        .eq("id", mediaId)
        .maybeSingle();
      if (!cancelled) setMedia((data as MediaItem | null) ?? null);
    }

    async function init() {
      // Upsert this display row
      await supabase
        .from("displays")
        .upsert({ id, last_seen_at: new Date().toISOString() }, { onConflict: "id" });

      const { data } = await supabase
        .from("displays")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      const row = data as DisplayRow | null;
      await loadMediaFor(row?.current_media_id ?? null);
      if (!cancelled) setReady(true);
    }

    init();

    // Heartbeat every 8s
    const heartbeat = setInterval(() => {
      supabase
        .from("displays")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", id);
    }, 8000);

    // Realtime subscription
    const channel = supabase
      .channel(`display:${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "displays", filter: `id=eq.${id}` },
        (payload) => {
          const row = payload.new as DisplayRow;
          loadMediaFor(row.current_media_id);

          // Respond to ping requests from control panel
          if (row.ping_requested_at) {
            const pingTime = new Date(row.ping_requested_at).getTime();
            if (pingTime > lastPingRespondedAt.current) {
              respondToPing();
            }
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [id, respondToPing]);

  // Try fullscreen on first interaction
  function enterFullscreen() {
    setInteracted(true);
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    }
  }

  // Restart video when media changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [media?.id, media?.video_url]);

  return (
    <div className="kiosk fixed inset-0 h-screen w-screen text-white" onClick={enterFullscreen}>
      {!ready ? (
        <Splash id={id} message="Conectando…" />
      ) : !media ? (
        <Splash id={id} message="Aguardando conteúdo" subtle />
      ) : media.video_url ? (
        <video
          ref={videoRef}
          key={media.id}
          src={media.video_url}
          className="h-full w-full object-cover animate-in fade-in duration-500"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />
      ) : media.image_url ? (
        <img
          key={media.id}
          src={media.image_url}
          alt={media.title}
          className="h-full w-full object-contain animate-in fade-in duration-500"
        />
      ) : (
        <Splash id={id} message={media.title} subtle />
      )}

      {!interacted && ready && (
        <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center">
          <div className="rounded-full bg-white/10 px-4 py-2 text-xs tracking-[0.18em] text-white/70 backdrop-blur">
            TOQUE PARA TELA CHEIA
          </div>
        </div>
      )}
    </div>
  );
}

function Splash({ id, message, subtle }: { id: string; message: string; subtle?: boolean }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-black text-center">
      <div className="text-[10px] tracking-[0.32em] text-white/30">STAGE</div>
      <div className="mt-2 text-xs tracking-[0.22em] text-white/40">{displayLabel(id).toUpperCase()}</div>
      <div className={`mt-8 text-2xl font-light tracking-tight ${subtle ? "text-white/60" : "text-white/80"}`}>
        {message}
      </div>
    </div>
  );
}
