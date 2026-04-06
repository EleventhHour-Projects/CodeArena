import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('http://34.126.214.18:6969/info', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // cache: 'no-store' // we want real-time stats
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch executor info: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Executor Info Proxy Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
