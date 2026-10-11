import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const executorUrl = process.env.EXECUTOR_SERVICE_URL;
    if (!executorUrl) {
      return NextResponse.json({ error: 'Executor service is currently offline' }, { status: 503 });
    }

    const response = await fetch(`${executorUrl}/api/admin/problem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to save to Code Executor backend' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Proxy Error saving problem:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
