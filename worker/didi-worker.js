export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "https://georgezhou2024.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") return new Response(null, {status: 204, headers: cors});
    if (request.method !== "POST") return new Response("Method Not Allowed", {status: 405, headers: cors});
    if (!env.DIDI_MCP_KEY) return new Response(JSON.stringify({error:"DIDI_MCP_KEY is not configured"}), {status:500, headers:{...cors,"Content-Type":"application/json"}});

    const body = await request.json();
    const fromLat = Number(body.from_lat);
    const fromLng = Number(body.from_lng);
    if (!Number.isFinite(fromLat) || !Number.isFinite(fromLng)) {
      return new Response(JSON.stringify({error:"Invalid current location"}), {status:400, headers:{...cors,"Content-Type":"application/json"}});
    }

    const rpc = {
      jsonrpc:"2.0",
      method:"tools/call",
      id:Date.now(),
      params:{
        name:"taxi_generate_ride_app_link",
        arguments:{
          from_lng:String(fromLng),
          from_lat:String(fromLat),
          to_lng:"116.455110",
          to_lat:"39.931566"
        }
      }
    };

    const response = await fetch("https://mcp.didichuxing.com/mcp-servers?key=" + encodeURIComponent(env.DIDI_MCP_KEY), {
      method:"POST",
      headers:{"Content-Type":"application/json; charset=utf-8","Accept":"application/json, text/event-stream"},
      body:JSON.stringify(rpc)
    });

    const text = await response.text();
    return new Response(JSON.stringify({status:response.status, data:text}), {
      status:response.ok ? 200 : 502,
      headers:{...cors,"Content-Type":"application/json; charset=utf-8"}
    });
  }
};
