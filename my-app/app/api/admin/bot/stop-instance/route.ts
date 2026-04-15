import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bot_id, instance_id } = body;

    if (bot_id == null || instance_id == null) {
      return NextResponse.json({ error: 'bot_id and instance_id are required' }, { status: 400 });
    }

    const botServiceUrl = process.env.BOT_SERVICE_URL || 'http://localhost:8000';
    const res = await fetch(`${botServiceUrl}/api/stop-instance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_id, instance_id }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Bot service returned ${res.status}: ${text}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Stop Instance Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
