import { NextResponse } from "next/server";

const DEPLOY_SERVER_BASE_URL =
  process.env.DEPLOY_SERVER_BASE_URL || "http://localhost:8080";
const CACHE_ADMIN_TOKEN = process.env.CACHE_ADMIN_TOKEN || "";

export async function POST(req: Request) {
  if (!CACHE_ADMIN_TOKEN) {
    return NextResponse.json(
      { success: false, error: "CACHE_ADMIN_TOKEN not configured on server" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  const targetUrl = username
    ? `${DEPLOY_SERVER_BASE_URL}/api/cache/reset?username=${encodeURIComponent(username)}`
    : `${DEPLOY_SERVER_BASE_URL}/api/cache/reset`;

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "X-Cache-Admin-Token": CACHE_ADMIN_TOKEN,
      },
    });

    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    return NextResponse.json({
      success: res.ok,
      status: res.status,
      username: username || null,
      result: json,
    });
  } catch (err: any) {
    console.error("Cache reset proxy error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to reach sponsor API" },
      { status: 502 }
    );
  }
}
