export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = buildCorsHeaders(origin, env.FRONTEND_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return json(
        { error: { message: "Método no permitido. Usa POST." } },
        { status: 405, headers: corsHeaders }
      );
    }

    if (!originAllowed(origin, env.FRONTEND_ORIGIN)) {
      return json(
        { error: { message: "Origen no autorizado." } },
        { status: 403, headers: corsHeaders }
      );
    }

    if (!env.OPENAI_API_KEY) {
      return json(
        { error: { message: "Falta OPENAI_API_KEY en los secretos del Worker." } },
        { status: 500, headers: corsHeaders }
      );
    }

    try {
      const rawBody = await request.text();
      const parsed = tryParseJson(rawBody);

      let endpoint = "chat/completions";
      let payload = parsed ?? {};

      if (
        parsed &&
        typeof parsed === "object" &&
        Object.prototype.hasOwnProperty.call(parsed, "endpoint") &&
        Object.prototype.hasOwnProperty.call(parsed, "payload")
      ) {
        endpoint = parsed.endpoint === "images" ? "images/generations" : "chat/completions";
        payload = parsed.payload;
      }

      const upstream = await fetch(`https://api.openai.com/v1/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8"
        }
      });
    } catch (error) {
      return json(
        {
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Error inesperado al conectar con OpenAI."
          }
        },
        { status: 500, headers: corsHeaders }
      );
    }
  }
};

function buildCorsHeaders(origin, frontendOrigin) {
  const allowedOrigin = originAllowed(origin, frontendOrigin) ? origin : frontendOrigin || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin"
  };
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function originAllowed(origin, frontendOrigin) {
  if (!origin || !frontendOrigin) return false;

  if (origin === frontendOrigin) return true;

  // Permite preview/local durante desarrollo.
  if (origin.startsWith("http://localhost:")) return true;
  if (origin.startsWith("http://127.0.0.1:")) return true;

  return false;
}

function json(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers || {})
    }
  });
}
