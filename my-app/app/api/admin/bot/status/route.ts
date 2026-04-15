import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const botServiceUrl = process.env.BOT_SERVICE_URL || 'http://localhost:8000';
    const res = await fetch(`${botServiceUrl}/api/status`, { cache: 'no-store' });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Bot service returned ${res.status}: ${text}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Bot Status Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
