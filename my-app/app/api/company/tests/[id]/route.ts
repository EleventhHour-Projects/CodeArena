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

// GET /api/company/tests/[id]
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCompanyAuth(request);
    if (!auth || auth.role !== 'company') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    const test = await TestAssessment.findOne({ _id: id, companyId: auth.id });
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 });

    return NextResponse.json({ test });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/company/tests/[id]
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCompanyAuth(request);
    if (!auth || auth.role !== 'company') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    await dbConnect();

    const test = await TestAssessment.findOneAndUpdate(
      { _id: id, companyId: auth.id },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 });

    return NextResponse.json({ test });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/company/tests/[id]
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCompanyAuth(request);
    if (!auth || auth.role !== 'company') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    const test = await TestAssessment.findOneAndDelete({ _id: id, companyId: auth.id });
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 });

    return NextResponse.json({ message: 'Test deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
