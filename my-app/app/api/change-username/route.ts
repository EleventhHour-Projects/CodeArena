import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";
import { userNameValidation } from "@/schemas/usernameSchema";

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json(
                { success: false, message: "Not authenticated" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const newUsername = body.username;

        if (!newUsername) {
             return NextResponse.json(
                { success: false, message: "Username query parameter is required" },
                { status: 400 }
            );
        }

        // Validate username using Zod
        const usernameValidationResult = userNameValidation.safeParse(newUsername);
        if (!usernameValidationResult.success) {
            const usernameErrors = usernameValidationResult.error.format()._errors || [];
            return NextResponse.json(
                { success: false, message: usernameErrors?.length > 0 ? usernameErrors[0] : "Invalid username" },
                { status: 400 }
            );
        }

        await dbConnect();

        // Fetch the user using the email from session
        const userObj = await UserModel.findOne({ email: session.user.email });

        if (!userObj) {
            return NextResponse.json(
                { success: false, message: "User not found" },
                { status: 404 }
            );
        }

        // Check the change limit
        if (userObj.usernameChangeCount >= 2) {
            return NextResponse.json(
                { success: false, message: "Username change limit reached (max 2 times)" },
                { status: 403 }
            );
        }

        if (userObj.username === newUsername) {
            return NextResponse.json(
                { success: false, message: "This is already your current username" },
                { status: 400 }
            );
        }

        // Check if the new username is already taken by someone else
        const existingUser = await UserModel.findOne({ username: newUsername });
        if (existingUser) {
             return NextResponse.json(
                { success: false, message: "Username is already taken" },
                { status: 400 }
            );
        }

        // Update username and increment count
        userObj.username = newUsername;
        userObj.usernameChangeCount += 1;
        await userObj.save();

        return NextResponse.json(
            { success: true, message: "Username changed successfully", currentCount: userObj.usernameChangeCount },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error changing username:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}

// In case you meant a GET request for this query param based mutation
export async function GET(request: NextRequest) {
    return POST(request);
}
