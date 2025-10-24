export async function decryptValueServerSide(
  encrypted: string | Record<string, any>,
  keyB64: string
): Promise<any> {
  // Example for a string encrypted with AES-GCM in Base64
  if (typeof encrypted === "string") {
    const [nonceB64, ciphertextB64, tagB64] = encrypted.split("^");

    const nonce = Uint8Array.from(atob(nonceB64), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
    const tag = Uint8Array.from(atob(tagB64), c => c.charCodeAt(0));

    const combined = new Uint8Array(ciphertext.length + tag.length);
    combined.set(ciphertext);
    combined.set(tag, ciphertext.length);

    const keyRaw = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyRaw,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    const plaintextBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, cryptoKey, combined);
    return new TextDecoder().decode(plaintextBuffer);
  } else if (typeof encrypted === "object" && encrypted !== null) {
    const result: any = Array.isArray(encrypted) ? [] : {};
    for (const key in encrypted) {
      result[key] = await decryptValueServerSide(encrypted[key], keyB64);
    }
    return result;
  } else {
    return encrypted;
  }
}
