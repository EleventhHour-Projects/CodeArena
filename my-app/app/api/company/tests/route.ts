import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import TestAssessment from '@/lib/models/TestAssessment';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-admin-key-code-arena';
const secretKey = new TextEncoder().encode(JWT_SECRET);

async function getCompanyAuth(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/company_token=([^;]+)/);
  const token = match?.[1];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as { id: string; email: string; role: string };
  } catch {
    return null;
  }
}

// GET /api/company/tests — list all tests for this company
export async function GET(request: Request) {
  try {
    const auth = await getCompanyAuth(request);
    if (!auth || auth.role !== 'company') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const tests = await TestAssessment.find({ companyId: auth.id }).sort({ createdAt: -1 });
    return NextResponse.json({ tests });
  } catch (error: any) {
    console.error('GET tests error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/company/tests — create a new test
export async function POST(request: Request) {
  try {
    const auth = await getCompanyAuth(request);
    if (!auth || auth.role !== 'company') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      instructions,
      durationMinutes,
      validFrom,
      validUntil,
      questions,
      proctoring,
      status,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    await dbConnect();

    const test = await TestAssessment.create({
      companyId: auth.id,
      title,
      description,
      instructions,
      durationMinutes: durationMinutes || 60,
      validFrom: validFrom ? new Date(validFrom) : undefined,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      questions: questions || [],
      proctoring: proctoring || {},
      status: status || 'draft',
    });

    return NextResponse.json({ test }, { status: 201 });
  } catch (error: any) {
    console.error('POST tests error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
