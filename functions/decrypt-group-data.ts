// functions/decrypt-group-data.ts

// Global variable to store the imported key, initialized once per Worker instance.
let importedKey: CryptoKey | undefined; 

/**
 * Imports the encryption key from the environment and caches it globally.
 */
async function getImportedKey(env: any): Promise<CryptoKey> {
    if (importedKey) {
        return importedKey;
    }
    
    const keyBase64 = env.encryption_key;
    if (!keyBase64) {
        throw new Error("Missing ENCRYPTION_KEY in environment variables.");
    }
    
    // Decode key from Base64
    const keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    
    // Import key for AES-GCM decryption
    importedKey = await crypto.subtle.importKey(
        "raw", 
        keyBytes, 
        "AES-GCM", 
        false, 
        ["decrypt"]
    );
    
    return importedKey;
}

/**
 * Decrypts a single custom-formatted encrypted string.
 */
async function decryptData(encryptedCustomFormat: string, key: CryptoKey): Promise<string> {
    // --- 1. Split the parts using the custom '^' separator ---
    const parts = encryptedCustomFormat.split('^');
    if (parts.length !== 3) {
        throw new Error("Invalid custom encrypted format: expected 3 parts separated by '^'.");
    }
    
    const [nonceB64, ciphertextB64, tagB64] = parts;

    // --- 2. Reverse the custom Base64 encoding for each part ---
    const reverseCustomB64 = (customB64: string): string => {
        // Reverse padding ($ -> =) and URL-safe chars (_ -> / and - -> +)
        return customB64
            .replace(/\$/g, '=')
            .replace(/_/g, '/').replace(/-/g, '+');
    };

    const finalNonceB64 = reverseCustomB64(nonceB64);
    const finalCiphertextB64 = reverseCustomB64(ciphertextB64);
    const finalTagB64 = reverseCustomB64(tagB64);

    // --- 3. Decode the parts using standard atob() ---
    const nonce = Uint8Array.from(atob(finalNonceB64), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(finalCiphertextB64), c => c.charCodeAt(0));
    const tag = Uint8Array.from(atob(finalTagB64), c => c.charCodeAt(0));

    // Combine ciphertext and tag (GCM tag must be appended to ciphertext for decrypt)
    const combinedCiphertextAndTag = new Uint8Array(ciphertext.length + tag.length);
    combinedCiphertextAndTag.set(ciphertext, 0);
    combinedCiphertextAndTag.set(tag, ciphertext.length);

    // --- 4. Decrypt ---
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: nonce }, 
        key,
        combinedCiphertextAndTag
    );
    
    return new TextDecoder().decode(decrypted);
}

// Cloudflare Pages Functions POST handler
export async function onRequestPost(context: { request: Request, env: any }) {
    const { request, env } = context;
    
    try {
        // EXPECT AN ARRAY: { data: ["enc1", "enc2", ...] }
        const { data: encryptedArray } = await request.json(); 

        if (!Array.isArray(encryptedArray) || encryptedArray.length === 0) {
            return new Response(
                JSON.stringify({ success: false, error: "Missing or invalid data array" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Get the pre-imported key once
        const key = await getImportedKey(env);
        
        // Decrypt all items concurrently on the server
        const decryptedResults = await Promise.all(
            encryptedArray.map(async (encryptedString: string) => {
                try {
                    return await decryptData(encryptedString, key);
                } catch (e) {
                    // Return null for a failed item so the client can handle it
                    console.error(`Decryption failed for an item: ${(e as Error).message}`);
                    return null; 
                }
            })
        );

        return new Response(
            JSON.stringify({ success: true, decrypted: decryptedResults }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        // Catch major errors (e.g., key missing, JSON parsing failure)
        console.error("Batch decryption request failed:", error);
        
        return new Response(
            JSON.stringify({ success: false, error: (error as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}