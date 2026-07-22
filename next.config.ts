import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Capas vêm da Open Library (acervo principal) e do fallback via Google
    // Books (/api/cover). Passar por next/image faz o Vercel cachear a versão
    // otimizada no edge — carregamentos seguintes (mesmo de outros
    // jogadores) não batem mais na origem a cada rodada.
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 dias — capas não mudam
  },
};

export default nextConfig;
