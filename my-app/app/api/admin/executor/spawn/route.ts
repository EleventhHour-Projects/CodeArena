import { NextResponse } from 'next/server';
import { EXECUTOR_SERVICE_URL } from '@/lib/config';

export async function POST() {
  try {
    const res = await fetch(`${EXECUTOR_SERVICE_URL}/api/internal/spawn`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': process.env.INTERNAL_KEY || '',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to spawn worker: ${res.status} ${errorText}`);
    }

    return NextResponse.json({ message: 'Worker spawned successfully' });
  } catch (error: any) {
    console.error('Spawn Worker Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
