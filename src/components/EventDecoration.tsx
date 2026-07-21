"use client";

import type { EventDef } from "@/lib/events";

type Layer = { kind: "float" | "fall" | "fly" | "twinkle"; emojis: string[]; count: number; size?: string };

/** Camadas de decoração ambiente por evento — puramente visual, não interativo. */
const DECOR: Record<string, Layer[]> = {
  // ------------------------------- sazonais ---------------------------------
  halloween: [
    { kind: "float", emojis: ["👻"], count: 7, size: "text-2xl" },
    { kind: "fly", emojis: ["🦇"], count: 3, size: "text-xl" },
    { kind: "fall", emojis: ["🕷️"], count: 4, size: "text-base" },
  ],
  "dia-das-criancas": [
    { kind: "float", emojis: ["🎈", "🧸", "🎈"], count: 8, size: "text-2xl" },
    { kind: "fall", emojis: ["🎊"], count: 4, size: "text-lg" },
  ],
  "black-friday": [
    { kind: "fall", emojis: ["🏷️", "💸"], count: 8, size: "text-lg" },
    { kind: "float", emojis: ["🛍️"], count: 2, size: "text-2xl" },
  ],
  natal: [
    { kind: "fall", emojis: ["❄️"], count: 14, size: "text-sm" },
    { kind: "float", emojis: ["🎄", "🎁"], count: 5, size: "text-2xl" },
    { kind: "twinkle", emojis: ["✨"], count: 6, size: "text-sm" },
  ],
  "ano-novo": [
    { kind: "twinkle", emojis: ["🎆", "✨", "🎇"], count: 10, size: "text-xl" },
    { kind: "float", emojis: ["🥂"], count: 3, size: "text-xl" },
  ],
  "dia-mundial-do-livro": [
    { kind: "float", emojis: ["📖", "🔖"], count: 6, size: "text-xl" },
    { kind: "twinkle", emojis: ["✨"], count: 6, size: "text-sm" },
  ],
  // -------------------------------- semanais ---------------------------------
  "semana-fantasia": [
    { kind: "twinkle", emojis: ["✨"], count: 10, size: "text-base" },
    { kind: "float", emojis: ["🧙"], count: 2, size: "text-2xl" },
    { kind: "fly", emojis: ["🐉"], count: 1, size: "text-2xl" },
  ],
  "semana-romance": [
    { kind: "float", emojis: ["💕", "🌹", "💌"], count: 8, size: "text-xl" },
  ],
  "semana-ficcao-cientifica": [
    { kind: "fly", emojis: ["🚀"], count: 1, size: "text-2xl" },
    { kind: "fly", emojis: ["🛸"], count: 1, size: "text-xl" },
    { kind: "twinkle", emojis: ["⭐"], count: 12, size: "text-sm" },
    { kind: "float", emojis: ["🪐"], count: 2, size: "text-2xl" },
  ],
  "semana-terror": [
    { kind: "fly", emojis: ["🦇"], count: 5, size: "text-lg" },
    { kind: "fall", emojis: ["🕷️"], count: 4, size: "text-base" },
  ],
  "semana-misterio": [
    { kind: "float", emojis: ["🔍"], count: 3, size: "text-xl" },
    { kind: "fly", emojis: ["🕵️"], count: 1, size: "text-xl" },
  ],
  "semana-classicos": [
    { kind: "float", emojis: ["📚", "✒️"], count: 6, size: "text-xl" },
  ],
  "semana-brasil": [
    { kind: "fall", emojis: ["🍃"], count: 6, size: "text-lg" },
    { kind: "float", emojis: ["📗", "🦜"], count: 4, size: "text-xl" },
  ],
};

/** Eventos com neblina no rodapé (clima de suspense/terror). */
const FOG_EVENTS = new Set(["halloween", "semana-terror", "semana-misterio"]);

/** Posições/durações determinísticas (sem Math.random — evita divergência SSR/cliente). */
function seeded(li: number, i: number) {
  const n = (li + 1) * 31 + i * 17;
  return {
    left: (n * 13) % 100,
    top: (n * 7) % 70,
    delay: (n % 25) / 5, // 0..5s
    duration: 7 + (n % 6), // 7..12s
  };
}

function Garland() {
  const colors = ["#ef4444", "#22c55e", "#eab308", "#38bdf8", "#ef4444", "#22c55e", "#eab308", "#38bdf8", "#ef4444"];
  return (
    <div className="absolute inset-x-0 top-0 flex justify-center gap-3 pt-1">
      {colors.map((color, i) => (
        <span
          key={i}
          className="animate-event-twinkle h-2 w-2 rounded-full"
          style={{ backgroundColor: color, animationDelay: `${i * 0.2}s`, animationDuration: "1.6s" }}
        />
      ))}
    </div>
  );
}

function Fog() {
  return (
    <div
      className="absolute inset-x-0 bottom-0 h-24 opacity-50"
      style={{ background: "linear-gradient(to top, rgba(148,163,184,0.25), transparent)" }}
    />
  );
}

export default function EventDecoration({ event }: { event: EventDef }) {
  const layers = DECOR[event.slug];

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {event.slug === "natal" && <Garland />}
      {FOG_EVENTS.has(event.slug) && <Fog />}

      {layers?.map((layer, li) =>
        Array.from({ length: layer.count }, (_, i) => {
          const emoji = layer.emojis[i % layer.emojis.length];
          const { left, top, delay, duration } = seeded(li, i);
          const size = layer.size ?? "text-lg";
          const key = `${li}-${i}`;

          if (layer.kind === "float") {
            return (
              <span
                key={key}
                className={`animate-event-float absolute bottom-0 ${size}`}
                style={{ left: `${left}%`, animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
              >
                {emoji}
              </span>
            );
          }
          if (layer.kind === "fall") {
            return (
              <span
                key={key}
                className={`animate-event-fall absolute -top-4 ${size}`}
                style={{ left: `${left}%`, animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
              >
                {emoji}
              </span>
            );
          }
          if (layer.kind === "twinkle") {
            return (
              <span
                key={key}
                className={`animate-event-twinkle absolute ${size}`}
                style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s`, animationDuration: "2.4s" }}
              >
                {emoji}
              </span>
            );
          }
          // fly
          return (
            <span
              key={key}
              className={`animate-event-fly absolute ${size}`}
              style={{ top: `${10 + top}%`, animationDelay: `${delay}s`, animationDuration: `${duration + 4}s` }}
            >
              {emoji}
            </span>
          );
        })
      )}
    </div>
  );
}
