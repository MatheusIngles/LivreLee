import crypto from "node:crypto";

/**
 * Token stateless do modo "maior ou menor" (Idade/Páginas/Vendas): carrega os
 * dois livros da rodada (o revelado e o oculto) e o streak atual, assinado
 * com HMAC. O valor do atributo do livro oculto nunca é enviado ao cliente
 * antes do palpite — só o id/título/capa.
 */

const SECRET =
  process.env.ROUND_SECRET || process.env.CRON_SECRET || "livrelee-dev-secret";

export interface CompareState {
  /** modo (age | pages | sales). */
  m: string;
  /** id do livro revelado (referência). */
  currentId: number;
  /** id do livro oculto (o que o jogador está avaliando). */
  nextId: number;
  /** acertos seguidos até agora nesta rodada. */
  streak: number;
}

export function signCompare(state: CompareState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyCompare(token: string): CompareState | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as CompareState;
  } catch {
    return null;
  }
}
