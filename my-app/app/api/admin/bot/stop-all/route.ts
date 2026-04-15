import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const botServiceUrl = process.env.BOT_SERVICE_URL || 'http://localhost:8000';
    const res = await fetch(`${botServiceUrl}/api/stop-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Bot service returned ${res.status}`);
    }

    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
