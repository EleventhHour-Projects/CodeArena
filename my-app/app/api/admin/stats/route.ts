import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { UserModel as User } from '@/lib/models/User';
import Battle from '@/lib/models/Battle';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';

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

    // Calculate user growth trend
    const growthTrend = [];
    const now = new Date();
    
    let daysToTrack = 7;
    let step = 1;

    if (period === '30d') {
      daysToTrack = 30;
      step = 3; // roughly 10 points
    } else if (period === 'all') {
      const firstUser = await User.findOne({}).sort({ createdAt: 1 });
      if (firstUser) {
        const diffMs = now.getTime() - new Date(firstUser.createdAt).getTime();
        daysToTrack = Math.max(7, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        step = Math.max(1, Math.floor(daysToTrack / 10)); // target ~10 points
      }
    }

    for (let i = daysToTrack - 1; i >= 0; i -= step) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(23, 59, 59, 999);

      const count = await User.countDocuments({ createdAt: { $lte: date } });
      growthTrend.push({
        date: date.toISOString(),
        users: count
      });
    }

    // Always ensure the very last point is the current total
    if (growthTrend[growthTrend.length - 1].users !== totalUsers) {
      growthTrend.push({ date: now.toISOString(), users: totalUsers });
    }

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalBattles,
      topUsers,
      recentBattles,
      growthTrend
    });
  } catch (error: any) {
    console.error('Admin Stats Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
