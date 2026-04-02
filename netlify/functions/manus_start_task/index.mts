import type { Context, Config } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  // Csak POST kéréseket fogadunk el
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { apiKey, prompt } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API key" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // A Manus API szerverhez irányítjuk a kérést
    const response = await fetch("https://api.manus.ai/v1/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "API_KEY": apiKey
      },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();

    if (!response.ok) {
        return new Response(JSON.stringify({ error: data.error?.message || data.message || "Manus API Error", status: response.status }), {
             status: response.status,
             headers: { "Content-Type": "application/json" }
        })
    }

    // Visszaküldjük a task ID-t
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
  path: "/api/manus/tasks"
};
