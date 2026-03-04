// rate limiter
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type RateLimitRecord = {
  count: number;
  lastReset: number;
};

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

const ipStore = new Map<string, RateLimitRecord>();

export function middleware(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for") ||
    "anonymous";

  const now = Date.now();

  const record = ipStore.get(ip);

  if (!record) {
    ipStore.set(ip, { count: 1, lastReset: now });
  } else {
    if (now - record.lastReset > RATE_LIMIT_WINDOW) {
      // reset window
      ipStore.set(ip, { count: 1, lastReset: now });
    } else {
      if (record.count >= MAX_REQUESTS) {
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429 }
        );
      }

      record.count++;
      ipStore.set(ip, record);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/check-username-unique"],
};