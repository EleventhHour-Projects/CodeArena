import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { UserModel as User } from '@/lib/models/User';
import Battle from '@/lib/models/Battle';

export async function GET() {
  try {
    await dbConnect();

    const totalUsers = await User.countDocuments();
    
    // Define "active" as active in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeUsers = await User.countDocuments({ 
      lastActive: { $gt: fiveMinutesAgo } 
    });

    const totalBattles = await Battle.countDocuments();

    // Fetch top 5 users by rating
    const topUsers = await User.find({})
      .sort({ rating: -1 })
      .limit(5)
      .select('username rating image battlesWon');

    // Fetch last 5 battles
    const recentBattles = await Battle.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('player1', 'username image')
      .populate('player2', 'username image');

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalBattles,
      topUsers,
      recentBattles
    });
  } catch (error: any) {
    console.error('Admin Stats Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
