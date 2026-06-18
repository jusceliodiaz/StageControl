# Plano: Sistema de Apresentações Imobiliárias

## Visão Geral

Aplicação web com duas interfaces sincronizadas em tempo real:
- **`/control`** — painel do corretor (tablet)
- **`/display`** — tela cheia para monitores (modo kiosk)

Sincronização via **Lovable Cloud** (Supabase Realtime + Storage + Postgres). Resposta < 1s sem refresh.

## Estrutura de Rotas

```
/              → landing simples com 2 botões (Controle / Display)
/control       → painel de controle (tablet)
/display       → seleção de identificador (left/center/right/...)
/display/$id   → tela fullscreen kiosk para o monitor escolhido
```

## Backend (Lovable Cloud)

Habilitar Cloud e criar:

**Tabelas**
- `media_items` — biblioteca de conteúdo
  - `id, title, category, cover_url, video_url, image_url, created_at`
  - categorias: Fachada, Rooftop, Piscina, Apartamentos, Localização, Implantação, Áreas Comuns, Institucional
- `scenes` — cenas (presets de 3+ monitores)
  - `id, name, assignments jsonb` (ex: `{ left: media_id, center: media_id, right: media_id }`)
- `displays` — estado atual de cada monitor
  - `id (text PK = "left"|"center"|"right"|...), current_media_id, updated_at, last_seen_at`

**Storage**
- Bucket público `presentations` para uploads (mp4/jpg/png/webp)

**Realtime**
- Replicação habilitada em `displays` e `scenes`
- Heartbeat: cada `/display/$id` envia `last_seen_at` a cada 10s → controle mostra online/offline

**RLS**
- Por enquanto leitura/escrita pública (stand interno, sem login). Estrutura preparada para roles depois.

## Tela Controle (`/control`)

Layout estilo Keynote/Tesla — preto, branco, cinza escuro, tipografia moderna, animações suaves.

Seções:
1. **Header**: logo, indicador "AO VIVO", contador displays conectados
2. **Painel de Monitores** — 3 cards lado a lado (Esquerda/Central/Direita):
   - status online/offline (dot verde/cinza + tempo da última comunicação)
   - thumbnail e título do conteúdo atual
   - botão "Limpar"
3. **Cenas** — carrossel horizontal de cards com nome + 3 mini-thumbs; tap aplica em todos os monitores simultaneamente
4. **Biblioteca de Conteúdo** — grid filtrável por categoria. Cada card mostra capa + título. Fluxo: selecionar mídia → escolher monitor de destino (ou arrastar para um dos 3 slots no topo)
5. **Upload** — drawer com dropzone (mp4/jpg/png/webp), título, categoria, capa opcional
6. **Editor de Cenas** — criar/editar cena (nome + atribuir mídia a cada slot)

## Tela Display (`/display`)

- Sem `id` na URL: tela de seleção com chips (Esquerda / Central / Direita / + custom). Salva em localStorage.
- Com `id`: fullscreen 100vw/100vh, fundo preto, cursor escondido (`cursor: none`), sem chrome.
  - Vídeo: `autoplay loop muted playsInline`, `object-fit: cover`
  - Imagem: `object-fit: contain` em alta qualidade
  - Transições suaves (fade) entre conteúdos
  - Assina realtime em `displays` filtrado por `id`; envia heartbeat
  - Tenta `requestFullscreen()` no primeiro toque

## Detalhes Técnicos

- **Stack**: TanStack Start + React + Tailwind v4 + shadcn (customizado)
- **Design tokens** em `src/styles.css`: preto profundo, off-white, cinzas, accent sutil
- **Componentes**: cards de monitor, grid de mídia, dropzone upload, editor de cenas
- **Escalabilidade**: `displays` por id-string permite adicionar `left2`, `lobby`, etc. sem schema change. `scenes.assignments` é jsonb — suporta N monitores.
- **Compatibilidade**: Chrome/Edge/Safari, iPad/Android tablet (touch-first)

## Diferenciais Futuros (estrutura preparada, não implementados agora)

- `displays.id` arbitrário + página `/display` com QR code do link específico
- `media_items` extensível com `kind: 'video'|'image'|'tour'|'3d'|'map'|'360'`
- Multi-stand: adicionar coluna `stand_id` quando necessário

## Entregáveis desta iteração

1. Habilitar Lovable Cloud + migration (tabelas, bucket, realtime, seeds de exemplo)
2. Layout base + design system premium
3. `/control` completo (monitores, biblioteca, cenas, upload, editor de cenas)
4. `/display` com seleção + modo kiosk realtime
5. Heartbeat + indicadores online/offline

Confirmo este plano e começo a implementar?
