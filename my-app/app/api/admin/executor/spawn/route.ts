import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const res = await fetch('http://127.0.0.1:6969/api/internal/spawn', {
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
