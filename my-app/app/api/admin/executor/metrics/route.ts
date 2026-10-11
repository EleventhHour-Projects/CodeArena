import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const executorUrl = process.env.EXECUTOR_SERVICE_URL;
    if (!executorUrl) {
      return NextResponse.json({ error: 'Executor service is currently offline' }, { status: 503 });
    }

    const res = await fetch(`${executorUrl}/metrics`, {
      method: 'GET',
      headers: {
        'X-Internal-Key': process.env.INTERNAL_KEY || '',
      },
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch metrics: ${res.status} ${errorText}`);
    }

    // Fiber monitor returns HTML/JS
    const data = await res.text();
    return new Response(data, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error: any) {
    console.error('Fetch Metrics Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
