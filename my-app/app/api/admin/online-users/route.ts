import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { UserModel as User } from '@/lib/models/User';

export async function GET() {
  try {
    await dbConnect();
    
    // 1. Fetch online user IDs from the executor service
    const res = await fetch('http://34.126.214.18:6969/api/internal/online-users', {
      method: 'GET',
      headers: {
        'X-Internal-Key': process.env.INTERNAL_KEY || '',
      },
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch online user IDs from executor: ${res.status} ${errorText}`);
    }

    const onlineUserIds: string[] = await res.json();

    if (!onlineUserIds || onlineUserIds.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Enrich IDs with user details from MongoDB
    // We only fetch essential fields to keep the payload small
    const enrichedUsers = await User.find({
      _id: { $in: onlineUserIds.filter(id => id.length === 24) } // basic validation for MongoDB ObjectID
    }).select('username email image rating lastActive');

    return NextResponse.json(enrichedUsers);
  } catch (error: any) {
    console.error('Admin Online Users Proxy Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
