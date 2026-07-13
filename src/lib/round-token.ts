import crypto from "node:crypto";

/**
 * Token de rodada: carrega a resposta de forma assinada (HMAC), para o servidor
 * validar o palpite sem manter sessão/estado. Como não há contas, é assim que a
 * resposta viaja até o cliente sem vazar (o cliente só recebe o token opaco) e
 * volta no palpite. Não é sigilo forte — apenas impede adulteração barata.
 */

const SECRET =
  process.env.ROUND_SECRET || process.env.CRON_SECRET || "livrelee-dev-secret";

export interface RoundAnswer {
  /** modo resolvido (no Mixed, o submodo sorteado). */
  m: string;
  /** id do livro-alvo (modos de livro). */
  b?: number;
  /** nome do autor-alvo (modos de autor). */
  a?: string;
  /** data do desafio (modos diários). */
  d?: string;
}

export function signRound(answer: RoundAnswer): string {
  const payload = Buffer.from(JSON.stringify(answer)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyRound(token: string): RoundAnswer | null {
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
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as RoundAnswer;
  } catch {
    return null;
  }
}
