import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-admin-key-code-arena'
);

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('company_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (payload.role !== 'company') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';

    // Handle JSON with Base64 Image
    if (contentType.includes('application/json')) {
      const body = await req.json();
      if (!body.image) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 });
      }
      return NextResponse.json({ success: true, url: body.image });
    }

    // Handle Multipart Form Data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 5MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = `data:${file.type || 'image/png'};base64,${buffer.toString('base64')}`;

    // Also attempt to write file to public directory
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'company');
      await fs.mkdir(uploadsDir, { recursive: true });

      let ext = '.png';
      if (file.type === 'image/jpeg') ext = '.jpg';
      else if (file.type === 'image/webp') ext = '.webp';
      else if (file.type === 'image/svg+xml') ext = '.svg';
      else if (file.type === 'image/gif') ext = '.gif';

      const filename = `logo-${uuidv4()}${ext}`;
      const filePath = path.join(uploadsDir, filename);
      await fs.writeFile(filePath, buffer);
    } catch (e) {
      console.warn('Could not write file to public uploads dir, using base64 data URI:', e);
    }

    return NextResponse.json({
      success: true,
      url: base64Data,
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
