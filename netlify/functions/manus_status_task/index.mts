import type { Context, Config } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const taskId = url.searchParams.get("taskId");
    const apiKey = req.headers.get("API_KEY") || url.searchParams.get("apiKey");

    if (!taskId) {
       return new Response(JSON.stringify({ error: "Missing Task ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API key" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const response = await fetch(`https://api.manus.ai/v1/tasks/${taskId}`, {
        headers: {
             "Accept": "application/json",
             "API_KEY": apiKey
        }
    });
    
    const data = await response.json();

    if (!response.ok) {
        return new Response(JSON.stringify({ error: data.error?.message || data.message || "Manus API Error", status: response.status }), {
             status: response.status,
             headers: { "Content-Type": "application/json" }
        })
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const config: Config = {
  path: "/api/manus/tasks-status"
};
