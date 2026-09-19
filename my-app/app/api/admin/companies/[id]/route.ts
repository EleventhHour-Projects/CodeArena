import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Company from '@/lib/models/Company';
import { requireAdmin } from '@/lib/auth/admin';

// GET /api/admin/companies/[id]
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await dbConnect();
    const company = await Company.findById(id).select('-password');
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ company });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/admin/companies/[id] — update or toggle active status
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    await dbConnect();

    // Prevent password updates via this route unless explicitly sending new password
    if (body.password) {
      // Re-hash by finding and saving through mongoose so pre-save hook fires
      const company = await Company.findById(id).select('+password');
      if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      Object.assign(company, body);
      await company.save();
      return NextResponse.json({ company: { id: company._id, name: company.name, email: company.email } });
    }

    const updated = await Company.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ company: updated });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/admin/companies/[id]
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await dbConnect();
    const company = await Company.findByIdAndDelete(id);
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ message: 'Company deleted' });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
