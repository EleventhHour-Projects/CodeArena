import { NextResponse } from 'next/server';
import { EXECUTOR_SERVICE_URL } from '@/lib/config';

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const response = await fetch(`${EXECUTOR_SERVICE_URL}/api/admin/problem`, {
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
