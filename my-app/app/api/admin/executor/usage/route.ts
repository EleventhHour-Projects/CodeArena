import { NextResponse } from 'next/server';
import { EXECUTOR_SERVICE_URL } from '@/lib/config';

export async function GET() {
  try {
    const res = await fetch(`${EXECUTOR_SERVICE_URL}/api/internal/usage`, {
      method: 'GET',
      headers: {
        'X-Internal-Key': process.env.INTERNAL_KEY || '',
      },
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch usage: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Fetch Usage Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
