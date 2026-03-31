import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReportModel from "@/lib/models/Report";
import { NotificationModel } from "@/lib/models/Notification";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ reportId: string }> | { reportId: string } }
) {
    try {
        await dbConnect();
        // @ts-ignore
        const params = await context.params;
        const reportId = params.reportId;

        const body = await request.json();
        const { message } = body;

        if (!message || !message.trim()) {
            return NextResponse.json({ success: false, message: "Notification message is required" }, { status: 400 });
        }

        const report = await ReportModel.findById(reportId);
        if (!report) {
            return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
        }

        // Send notification to the reporter (the user who raised the report)
        await NotificationModel.create({
            userId: report.reporter,
            message: message.trim(),
            type: "system",
        });

        // Persist the reply and mark report as accepted (acknowledged)
        report.adminReply = message.trim();
        report.status = "Accepted";
        await report.save();

        return NextResponse.json({ success: true, message: "Notification sent to reporter" });
    } catch (err: any) {
        console.error("Notify Reporter Error:", err);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
