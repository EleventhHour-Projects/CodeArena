import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const botServiceUrl = process.env.BOT_SERVICE_URL || 'http://localhost:8000';
    
    // Fetch logs from the bot service
    const res = await fetch(`${botServiceUrl}/api/logs`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch logs: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Bot Logs Proxy Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
