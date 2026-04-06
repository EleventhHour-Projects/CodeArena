import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.pr_number || !Array.isArray(body.pr_number)) {
      return NextResponse.json(
        { error: 'pr_number must be an array of integers' },
        { status: 400 }
      );
    }

    const res = await fetch('http://127.0.0.1:6969/api/internal/merge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': process.env.INTERNAL_KEY || '',
      },
      body: JSON.stringify({ pr_number: body.pr_number }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to merge PR: ${res.status} ${errorText}`);
    }

    return NextResponse.json({ message: 'PR merged successfully' });
  } catch (error: any) {
    console.error('Merge PR Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
