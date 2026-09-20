const ALLOWED_ORIGIN = "https://georgezhou2024.github.io";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function findUrl(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const m = value.match(/https?:\/\/[^\s"'<>]+/i);
    return m ? m[0] : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const u = findUrl(item);
      if (u) return u;
    }
  }
  if (typeof value === "object") {
    for (const key of ["url", "link", "appLink", "app_link", "deeplink", "deepLink", "deep_link"]) {
      const u = findUrl(value[key]);
      if (u) return u;
    }
    for (const key of Object.keys(value)) {
      const u = findUrl(value[key]);
      if (u) return u;
    }
  }
  return null;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    if (request.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
    if (!env.DIDI_MCP_KEY) return json({ error: "DIDI_MCP_KEY is not configured" }, 500);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const fromLat = Number(body.from_lat);
    const fromLng = Number(body.from_lng);
    if (!Number.isFinite(fromLat) || !Number.isFinite(fromLng)) {
      return json({ error: "Invalid current location" }, 400);
    }

    const rpc = {
      jsonrpc: "2.0",
      method: "tools/call",
      id: Date.now(),
      params: {
        name: "taxi_generate_ride_app_link",
        arguments: {
          from_lng: String(fromLng),
          from_lat: String(fromLat),
          to_lng: "116.455110",
          to_lat: "39.931566"
        }
      }
    };

    const response = await fetch(
      "https://mcp.didichuxing.com/mcp-servers?key=" + encodeURIComponent(env.DIDI_MCP_KEY),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Accept": "application/json, text/event-stream"
        },
        body: JSON.stringify(rpc)
      }
    );

    const raw = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const matches = [...raw.matchAll(/data:\s*({[\\s\\S]*?})(?:\\r?\\n|$)/g)];
      if (matches.length) {
        try { parsed = JSON.parse(matches[matches.length - 1][1]); } catch {}
      }
    }

    if (!response.ok) {
      return json({ error: "DiDi MCP request failed", status: response.status }, 502);
    }

    const url = findUrl(parsed) || findUrl(raw);
    if (!url) {
      return json({ error: "DiDi response did not contain a launch link", raw: parsed ?? raw }, 502);
    }

    return json({ url });
  }
};
