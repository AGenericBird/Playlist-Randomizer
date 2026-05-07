export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. CORS Headers: Allows your GitHub Pages site to talk to this Worker safely
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // You can change "*" to your specific GitHub Pages URL later for max security
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Respond to preflight checks
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ---------------------------------------------------------
    // ROUTE 1: Secure YouTube API Fetcher
    // ---------------------------------------------------------
    if (url.pathname === "/api/get-playlist" && request.method === "GET") {
      const playlistId = url.searchParams.get("playlistId");
      const pageToken = url.searchParams.get("pageToken") || "";

      if (!playlistId) return new Response("Missing playlistId", { status: 400, headers: corsHeaders });

      // The Worker injects the secret API key here, on the server side
      const ytUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${env.YOUTUBE_API_KEY}&pageToken=${pageToken}`;

      try {
        const response = await fetch(ytUrl);
        const data = await response.json();
        return new Response(JSON.stringify(data), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      } catch (error) {
        return new Response("YouTube API Error", { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------
    // ROUTE 2: Secure Supabase Logger
    // ---------------------------------------------------------
    if (url.pathname === "/api/log-play" && request.method === "POST") {
      try {
        const body = await request.json();

        const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/incoming_plays`;
        
        // The Worker injects the secret database keys here
        await fetch(supabaseUrl, {
          method: "POST",
          headers: {
            "apikey": env.SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (error) {
        return new Response("Database Logging Error", { status: 500, headers: corsHeaders });
      }
    }

    // Default response if the route doesn't exist
    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};