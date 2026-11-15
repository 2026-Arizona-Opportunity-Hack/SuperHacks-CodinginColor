import "server-only";
import crypto from "crypto";
import bs58 from "bs58";
import { one, q } from "./db";

/**
 * Tamper-evident proofs on Solana. We hash a document (certificate or funder report) and write
 * only that hash to the chain in a Memo instruction. Anyone can later recompute the hash from the
 * document and compare it with the on-chain memo: if a single number changed, they won't match.
 *
 *   SOLANA_SECRET_KEY   base58 or JSON-array secret key of a funded wallet (devnet is fine)
 *   SOLANA_RPC_URL      optional, defaults to https://api.devnet.solana.com
 * Without a key, proofs are still created and hashed; they just aren't anchored on-chain.
 */

const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
export const solanaCluster = () => (process.env.SOLANA_RPC_URL?.includes("mainnet") ? "mainnet-beta" : "devnet");
export const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=${solanaCluster()}`;

/** Stable JSON: keys sorted at every level, so the same document always hashes the same. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as object)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}
export const hashOf = (payload: unknown) => crypto.createHash("sha256").update(canonical(payload)).digest("hex");

async function anchor(memo: string): Promise<string | null> {
  const secret = process.env.SOLANA_SECRET_KEY;
  if (!secret) return null;
  try {
    const { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction } = await import("@solana/web3.js");
    const key = secret.trim().startsWith("[") ? Uint8Array.from(JSON.parse(secret)) : bs58.decode(secret.trim());
    const payer = Keypair.fromSecretKey(key);
    const conn = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com", "confirmed");
    const ix = new TransactionInstruction({ programId: new PublicKey(MEMO_PROGRAM), keys: [], data: Buffer.from(memo, "utf8") });
    return await sendAndConfirmTransaction(conn, new Transaction().add(ix), [payer], { commitment: "confirmed" });
  } catch (e) {
    console.error("Solana anchoring failed:", (e as Error).message);
    return null;
  }
}

export async function createProof(kind: "certificate" | "report", payload: object, studentId?: string) {
  const hash = hashOf(payload);
  const signature = await anchor(`CIC-${kind.toUpperCase()}:${hash}`);
  const [row] = await q(
    "INSERT INTO proofs (kind, student_id, payload, hash, signature, cluster) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    [kind, studentId ?? null, JSON.stringify(payload), hash, signature, solanaCluster()]
  );
  return { id: row.id as string, hash, signature };
}

/** Re-checks a proof: recompute the hash from the stored document and read the memo back from the chain. */
export async function verifyProof(id: string) {
  const p = await one("SELECT * FROM proofs WHERE id = $1", [id]);
  if (!p) return null;
  const recomputed = hashOf(p.payload);
  let onChain: "match" | "mismatch" | "not_anchored" | "unreachable" = p.signature ? "unreachable" : "not_anchored";
  if (p.signature) {
    try {
      const { Connection } = await import("@solana/web3.js");
      const conn = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com", "confirmed");
      const tx = await conn.getTransaction(p.signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
      const logs = tx?.meta?.logMessages?.join("\n") ?? "";
      onChain = logs.includes(recomputed) ? "match" : tx ? "mismatch" : "unreachable";
    } catch {
      onChain = "unreachable";
    }
  }
  return { proof: p, recomputed, intact: recomputed === p.hash, onChain };
}
