import { userNameValidation } from "@/schemas/usernameSchema";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";

export async function GET(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const username = searchParams.get("username");
        if (!username) {
            return NextResponse.json({ error: "Username is required" }, { status: 400 });
        }
        const result = userNameValidation.safeParse(username);
        if (!result.success) {
            const usernameErrors = result.error.format()._errors || [];
            return NextResponse.json(
                { error: usernameErrors?.length > 0 ? usernameErrors.join(", ") : "Invalid username" }, 
                { status: 400 }
            );
        }
        
        const existingUser = await UserModel.findOne({ username: result.data });
        if (existingUser) {
            return NextResponse.json({ error: "Username already exists" }, { status: 400 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error checking username uniqueness", error);
        return NextResponse.json({ error: "Error checking username uniqueness" }, { status: 500 });
    }
}