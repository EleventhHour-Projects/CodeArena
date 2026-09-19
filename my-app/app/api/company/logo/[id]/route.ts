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

    const company = await Company.findById(id)
      .select('logo')
      .lean();

    if (!company?.logo) {
      return new NextResponse('Logo not found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    const logo = company.logo;

    // MongoDB stores:
    // data:image/png;base64,iVBORw0KGgo...
    const match = logo.match(
      /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
    );

    if (!match) {
      console.error('Invalid company logo format');

      return new NextResponse('Invalid logo format', {
        status: 400,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    const contentType = match[1];
    const base64Data = match[2];

    const imageBuffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageBuffer.length.toString(),

        // Important for Gmail's image proxy
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',

        // Tell clients this is an image, not a download
        'Content-Disposition': 'inline',
      },
    });
  } catch (error) {
    console.error('Company logo API error:', error);

    return new NextResponse('Internal Server Error', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}