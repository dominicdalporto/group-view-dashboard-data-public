// Cloudflare Pages Function: decrypt-group-data
export async function onRequestPost({ request, env }) {
  try {
    // 1. Parse incoming JSON
    const body = await request.json();
    const encryptedData = body.data;
    if (!encryptedData) {
      return new Response(JSON.stringify({ success: false, error: "No data provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Get the encryption key from Pages secrets
    const keyB64 = env.encryption_key;
    if (!keyB64) {
      return new Response(JSON.stringify({ success: false, error: "ENCRYPTION_KEY not set" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Decode Base64 key
    const keyRaw = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyRaw,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    // 4. Decode the encrypted string
    // Expected format: nonce^ciphertext^tag
    const [nonceB64, ciphertextB64, tagB64] = encryptedData.split("^");
    if (!nonceB64 || !ciphertextB64 || !tagB64) {
      return new Response(JSON.stringify({ success: false, error: "Invalid encrypted format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const base64ToBytes = (str: string) =>
      Uint8Array.from(atob(str.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

    const nonce = base64ToBytes(nonceB64);
    const ciphertext = base64ToBytes(ciphertextB64);
    const tag = base64ToBytes(tagB64);

    // AES-GCM expects ciphertext || tag
    const combined = new Uint8Array(ciphertext.length + tag.length);
    combined.set(ciphertext);
    combined.set(tag, ciphertext.length);

    // 5. Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: nonce },
      cryptoKey,
      combined
    );
    const decrypted = new TextDecoder().decode(decryptedBuffer);

    // 6. Return JSON
    return new Response(JSON.stringify({ success: true, decrypted }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Decryption failed:", err);
    return new Response(JSON.stringify({ success: false, error: "Server decryption failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
