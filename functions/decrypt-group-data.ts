export async function onRequest(context) {
  try {
    const { request, env } = context;
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const { data } = await request.json(); // encrypted data
    const key = env.encryption_key;
    if (!key) throw new Error("ENCRYPTION_KEY not set");

    // Perform decryption here
    const decrypted = myDecryptFunction(data, key);

    return new Response(JSON.stringify({ success: true, decrypted }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }
}
