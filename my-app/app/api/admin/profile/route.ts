import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import dbConnect from '@/lib/dbConnect';
import Admin from '@/lib/models/Admin';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-admin-key-code-arena';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload;
    try {
      const decoded = await jwtVerify(token, secretKey);
      payload = decoded.payload;
    } catch (e) {
      console.error('JWT Verification failed:', e);
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const adminId = String(payload.id);

    // Use try-catch for JSON parsing in case of large payload errors
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('JSON Parse failed (Check body size):', e);
      return NextResponse.json({ error: 'Payload too large or invalid' }, { status: 413 });
    }

    const { image } = body;

    await dbConnect();
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    if (image !== undefined) {
      // Basic validation for URL or Base64
      if (image && !image.startsWith('http') && !image.startsWith('data:image')) {
        return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
      }
      admin.image = image;
    }

    await admin.save();

    return NextResponse.json({ 
      message: 'Profile photo updated successfully', 
      admin: { username: admin.username, image: admin.image } 
    });
  } catch (error: any) {
    console.error('Detailed Admin Profile Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
