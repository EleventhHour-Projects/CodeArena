import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Admin from '@/lib/models/Admin';
import { SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-admin-key-code-arena';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    await dbConnect();

    // Find admin and select password field since it is hidden by default
    const admin = await Admin.findOne({ username }).select('+password');
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate JWT
    const alg = 'HS256';
    const token = await new SignJWT({ id: admin._id.toString(), username: admin.username, role: 'admin' })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime('24h') // 24 hours
      .sign(secretKey);

    // Create response and set cookie
    const response = NextResponse.json({ message: 'Login successful' }, { status: 200 });
    
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours in seconds
    });

    return response;
  } catch (error: any) {
    console.error('Admin Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
