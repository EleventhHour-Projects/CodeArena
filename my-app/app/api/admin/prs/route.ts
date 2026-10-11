import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const executorUrl = process.env.EXECUTOR_SERVICE_URL;
    if (!executorUrl) {
      return NextResponse.json({ error: 'Executor service is currently offline' }, { status: 503 });
    }

    const res = await fetch(`${executorUrl}/api/internal/prs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': process.env.INTERNAL_KEY || '',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch PRs: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Fetch PRs Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
