import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const botServiceUrl = process.env.BOT_SERVICE_URL || 'http://localhost:8000';
    const res = await fetch(`${botServiceUrl}/api/auto-spawn`, { cache: 'no-store' });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Bot service returned ${res.status}: ${text}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Bot Auto-Spawn GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const botServiceUrl = process.env.BOT_SERVICE_URL || 'http://localhost:8000';
    const res = await fetch(`${botServiceUrl}/api/auto-spawn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Bot service returned ${res.status}: ${text}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Bot Auto-Spawn POST Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
