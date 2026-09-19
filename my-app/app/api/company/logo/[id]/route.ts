import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Company from '@/lib/models/Company';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await dbConnect();

    const company = await Company.findById(id).select('logo').lean();

    if (!company?.logo) {
      return new NextResponse(null, { status: 404 });
    }

    const logo = company.logo;

    // Expecting:
    // data:image/png;base64,XXXXX
    const match = logo.match(/^data:(image\/[^;]+);base64,(.+)$/);

    if (!match) {
      return new NextResponse(null, { status: 400 });
    }

    const contentType = match[1];
    const base64Data = match[2];

    const imageBuffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Company logo error:', error);

    return new NextResponse(null, {
      status: 500,
    });
  }
}