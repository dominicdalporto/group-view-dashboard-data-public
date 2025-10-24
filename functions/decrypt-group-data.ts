export async function onRequest(context) {
  try {
    const { request, env } = context;
    const { data } = await request.json();

    if (!data) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing 'data' field" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const key = env.encryption_key;
    if (!key) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing ENCRYPTION_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Decrypt using Web Crypto API
    const decrypted = await decryptData(data, key);

    return new Response(
      JSON.stringify({ success: true, decrypted }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function decryptData(encryptedBase64, keyBase64) {
  const keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);

  const encryptedBytes = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = encryptedBytes.slice(0, 12);
  const ciphertext = encryptedBytes.slice(12);

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}
