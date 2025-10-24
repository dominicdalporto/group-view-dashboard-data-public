import { Env } from '@cloudflare/workers-types';

export interface Env {
  encryption_key: string;
}

// Example function to decrypt AES-GCM values
async function decryptValue(aesKeyB64: string, encrypted: string): Promise<string> {
  const [nonceB64, ciphertextB64, tagB64] = encrypted.split("^");
  const nonce = Uint8Array.from(atob(nonceB64), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
  const tag = Uint8Array.from(atob(tagB64), c => c.charCodeAt(0));

  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  const keyRaw = Uint8Array.from(atob(aesKeyB64), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyRaw,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce },
    cryptoKey,
    combined
  );

  return new TextDecoder().decode(plaintextBuffer);
}

export async function onRequest({ request, env }: { request: Request, env: Env }) {
  try {
    const { encrypted } = await request.json();
    if (!encrypted) return new Response("Missing encrypted value", { status: 400 });

    const decrypted = await decryptValue(env.encryption_key, encrypted);

    return new Response(JSON.stringify({ decrypted }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as any).message }), { status: 500 });
  }
}
