import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ReportModel from '@/lib/models/Report';
import { UserModel } from '@/lib/models/User';
import BattleModel from '@/lib/models/Battle';

export async function GET() {
    try {
        await dbConnect();
        
        // Ensure models are registered
        UserModel.schema;
        BattleModel.schema;

        const reports = await ReportModel.find({})
            .sort({ createdAt: -1 })
            .populate('reporter', 'username image')
            .populate('reported', 'username image');
            
        return NextResponse.json({ success: true, reports });
    } catch (error: any) {
        console.error('Fetch Reports Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
