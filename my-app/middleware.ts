import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from 'jose';

type RateLimitRecord = {
  count: number;
  lastReset: number;
};

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

const ipStore = new Map<string, RateLimitRecord>();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-admin-key-code-arena';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Admin Authentication Check
  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
    // Exclude login paths
    if (path === '/admin/login' || path === '/api/admin/login' || path === '/api/admin/setup') {
      return NextResponse.next();
    }

    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      await jwtVerify(token, secretKey);
    } catch (err) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // 2. Company Authentication Check
  if (path.startsWith('/company') || path.startsWith('/api/company')) {
    // Exclude login/logout
    if (path === '/company/login' || path === '/api/company/login' || path === '/api/company/logout') {
      return NextResponse.next();
    }

    const token = request.cookies.get('company_token')?.value;

    if (!token) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/company/login', request.url));
    }

    try {
      await jwtVerify(token, secretKey);
    } catch (err) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/company/login', request.url));
    }
  }

  // 2. Rate Limiting for specific routes
  if (path === '/api/check-username-unique') {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const now = Date.now();
    const record = ipStore.get(ip);

    if (!record) {
      ipStore.set(ip, { count: 1, lastReset: now });
    } else {
      if (now - record.lastReset > RATE_LIMIT_WINDOW) {
        ipStore.set(ip, { count: 1, lastReset: now });
      } else {
        if (record.count >= MAX_REQUESTS) {
          return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }
        record.count++;
        ipStore.set(ip, record);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/check-username-unique",
    "/admin/:path*",
    "/api/admin/:path*",
    "/company/:path*",
    "/api/company/:path*",
  ],
};