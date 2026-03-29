import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('http://127.0.0.1:6969/api/internal/auto', {
      method: 'GET',
      headers: {
        'X-Internal-Key': process.env.INTERNAL_KEY || '',
      },
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch auto status: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Fetch Auto Status Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch('http://127.0.0.1:6969/api/internal/auto', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': process.env.INTERNAL_KEY || '',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to set auto status: ${res.status} ${errorText}`);
    }

    return NextResponse.json({ message: 'Auto status updated successfully' });
  } catch (error: any) {
    console.error('Update Auto Status Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
