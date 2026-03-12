import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";
import ProfileClient from "./ProfileClient";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    await dbConnect();
    const dbUser = await UserModel.findOne({ email: session.user.email });
    
    // Convert to a plain object or just pass the count
    const initialChangeCount = dbUser?.usernameChangeCount || 0;

    return <ProfileClient initialChangeCount={initialChangeCount} />;
}
