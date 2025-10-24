export async function onRequestPost(context) {
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

async function decryptData(encryptedCustomFormat, keyBase64) {
    // --- 1. Split the parts using your custom '^' separator ---
    const parts = encryptedCustomFormat.split('^');
    if (parts.length !== 3) {
        throw new Error("Invalid custom encrypted format: expected 3 parts separated by '^'.");
    }
    
    // The three parts are: [nonce, ciphertext, tag]
    const [nonceB64, ciphertextB64, tagB64] = parts;

    // --- 2. Reverse the custom Base64 encoding for each part ---
    const reverseCustomB64 = (customB64) => {
        // Reverse padding ($ -> =)
        let standardB64 = customB64.replace(/\$/g, '=');
        // Reverse URL-safe chars (_ -> / and - -> +)
        standardB64 = standardB64.replace(/_/g, '/').replace(/-/g, '+');
        // NOTE: You used '&' -> '~' but that character is not in your output example, 
        //       so we will assume the above two replacements are sufficient based on the snippet.
        
        return standardB64;
    };

    const finalNonceB64 = reverseCustomB64(nonceB64);
    const finalCiphertextB64 = reverseCustomB64(ciphertextB64);
    const finalTagB64 = reverseCustomB64(tagB64);

    // --- 3. Import Key (No change needed here) ---
    const keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);

    // --- 4. Decode the parts using standard atob() and combine ---
    const nonce = Uint8Array.from(atob(finalNonceB64), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(finalCiphertextB64), c => c.charCodeAt(0));
    const tag = Uint8Array.from(atob(finalTagB64), c => c.charCodeAt(0));

    // Combine ciphertext and tag for decryption (as they were split in Python)
    // AES-GCM tags are 16 bytes. Cloudflare's Web Crypto API expects them 
    // to be part of the ciphertext when passed to decrypt.
    const combinedCiphertextAndTag = new Uint8Array(ciphertext.length + tag.length);
    combinedCiphertextAndTag.set(ciphertext, 0);
    combinedCiphertextAndTag.set(tag, ciphertext.length);


    // --- 5. Decrypt ---
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: nonce }, // nonce is used as the IV
        key,
        combinedCiphertextAndTag // Pass the combined data
    );
    
    return new TextDecoder().decode(decrypted);
}