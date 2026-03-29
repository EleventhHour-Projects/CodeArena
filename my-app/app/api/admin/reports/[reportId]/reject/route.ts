import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReportModel from "@/lib/models/Report";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ reportId: string }> | { reportId: string } }
) {
    try {
        await dbConnect();
        // @ts-ignore
        const params = await context.params;
        const reportId = params.reportId;

        const report = await ReportModel.findById(reportId);
        if (!report) {
            return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
        }

        if (report.status !== "Pending") {
            return NextResponse.json({ success: false, message: "Report is already processed" }, { status: 400 });
        }

        report.status = "Rejected";
        await report.save();

        return NextResponse.json({ success: true, message: "Report rejected" }, { status: 200 });
    } catch (err: any) {
        console.error("Reject Report Error:", err);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
