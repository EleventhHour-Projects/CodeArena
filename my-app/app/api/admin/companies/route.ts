import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Company from '@/lib/models/Company';
import { requireAdmin } from '@/lib/auth/admin';

// GET /api/admin/companies — list all companies
export async function GET() {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const companies = await Company.find().select('-password').sort({ createdAt: -1 });
    return NextResponse.json({ companies });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/admin/companies — create a new company (admin only)
export async function POST(request: Request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const { name, email, password, logo, website, description } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    await dbConnect();

    const existing = await Company.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'A company with this email already exists' }, { status: 409 });
    }

    const company = await Company.create({
      name,
      email,
      password,
      logo: logo || '',
      website: website || '',
      description: description || '',
      createdByAdmin: true,
    });

    return NextResponse.json(
      {
        company: {
          id: company._id.toString(),
          name: company.name,
          email: company.email,
          isActive: company.isActive,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Create company error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
