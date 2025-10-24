export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json();
    const encryptedData = body.data;

    // Example decryption using ENCRYPTION_KEY
    const key = env.encryption_key;
    if (!key) throw new Error("ENCRYPTION_KEY not set");

    // ...insert your decryption logic here, e.g., AES-GCM...
    const decryptedData = decryptGroupData(encryptedData, key); 

    return new Response(JSON.stringify({ success: true, decrypted: decryptedData }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
