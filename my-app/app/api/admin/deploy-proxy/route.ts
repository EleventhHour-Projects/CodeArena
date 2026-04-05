import { NextRequest, NextResponse } from "next/server";

const DEPLOY_SERVER_BASE_URL = "http://34.126.214.18:8080";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint");
  const service = searchParams.get("service");

  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
  }

  const token = req.headers.get("X-Deploy-Token");
  const headers: HeadersInit = {};
  if (token) headers["X-Deploy-Token"] = token;

  const url = new URL(`${DEPLOY_SERVER_BASE_URL}${endpoint}`);
  if (service) url.searchParams.set("service", service);

  try {
    const res = await fetch(url.toString(), { 
        headers,
        cache: 'no-store' // Ensure we get fresh logs
    });
    
    // Check if response is JSON
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } else {
        const text = await res.text();
        return NextResponse.json({ message: text }, { status: res.status });
    }
  } catch (err) {
    console.error("Proxy error:", err);
    return NextResponse.json({ error: "Failed to fetch from deployment server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint");

  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
  }

  const token = req.headers.get("X-Deploy-Token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["X-Deploy-Token"] = token;

  const url = `${DEPLOY_SERVER_BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, { 
        method: "POST", 
        headers 
    });
    
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } else {
        const text = await res.text();
        return NextResponse.json({ message: text }, { status: res.status });
    }
  } catch (err) {
    console.error("Proxy error:", err);
    return NextResponse.json({ error: "Failed to post to deployment server" }, { status: 500 });
  }
}
