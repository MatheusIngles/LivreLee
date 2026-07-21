"use client";

const EMOJI = ["🎉", "📚", "✨", "🎊", "⭐"];
// Posições/atrasos fixos (determinístico — sem Math.random no render do servidor).
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 137) % 100,
  delay: (i % 7) * 0.08,
  emoji: EMOJI[i % EMOJI.length],
}));

/** Explosão curta de emojis caindo, usada ao vencer uma rodada. */
export default function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-0 overflow-visible">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="animate-confetti absolute top-0 text-xl"
          style={{ left: `${p.left}%`, animationDelay: `${p.delay}s` }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
