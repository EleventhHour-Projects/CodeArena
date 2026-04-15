import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const botServiceUrl = process.env.BOT_SERVICE_URL || 'http://localhost:8000';
    const res = await fetch(`${botServiceUrl}/api/pool`, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error(`Bot service returned ${res.status}`);
    }

    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
