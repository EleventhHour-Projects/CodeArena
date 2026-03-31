import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReportModel from "@/lib/models/Report";
import SubmissionModel from "@/lib/models/Submission";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ reportId: string }> | { reportId: string } }
) {
    try {
        await dbConnect();
        // @ts-ignore
        const params = await context.params;
        const reportId = params.reportId;

        const report = await ReportModel.findById(reportId)
            .populate('reporter', 'username image')
            .populate('reported', 'username image')
            .populate('battleId');

        if (!report) {
            return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
        }

        // For Bug/Feedback/Other reports, battleId or reported may be null
        let submissions: any[] = [];
        if (report.battleId && report.reported) {
            submissions = await SubmissionModel.find({
                battleId: (report.battleId as any)._id,
                userId: (report.reported as any)._id
            }).sort({ createdAt: 1 });
        }

        return NextResponse.json({ success: true, report, submissions });
    } catch (error: any) {
        console.error("Error fetching report details:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
