import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bot_id } = body;

    const res = await fetch('http://localhost:8000/api/stop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bot_id }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to stop bot: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Stop Bot Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
