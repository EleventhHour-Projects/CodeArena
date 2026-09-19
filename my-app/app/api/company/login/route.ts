import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Company from '@/lib/models/Company';
import { SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-admin-key-code-arena';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    await dbConnect();

    const company = await Company.findOne({ email }).select('+password');
    if (!company) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!company.isActive) {
      return NextResponse.json({ error: 'Account is deactivated. Contact admin.' }, { status: 403 });
    }

    const isMatch = await company.comparePassword(password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await new SignJWT({
      id: company._id.toString(),
      email: company.email,
      role: 'company',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secretKey);

    const response = NextResponse.json({
      message: 'Login successful',
      company: {
        id: company._id.toString(),
        name: company.name,
        email: company.email,
        logo: company.logo,
      },
    });

    response.cookies.set('company_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Company Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
