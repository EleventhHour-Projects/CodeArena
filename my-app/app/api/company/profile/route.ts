import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Company from '@/lib/models/Company';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-admin-key-code-arena';
const secretKey = new TextEncoder().encode(JWT_SECRET);

async function getCompanyFromRequest(request: Request) {
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

export async function GET(request: Request) {
  try {
    const auth = await getCompanyFromRequest(request);
    if (!auth || auth.role !== 'company') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const company = await Company.findById(auth.id).select('-password');
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ company });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getCompanyFromRequest(request);
    if (!auth || auth.role !== 'company') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, logo, website, description } = body;

    await dbConnect();
    const updated = await Company.findByIdAndUpdate(
      auth.id,
      { $set: { name, logo, website, description } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ company: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
