import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
        })
    ],
    callbacks: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async signIn({ user, account }: any) {
            if (account?.provider === "google") {
                try {
                    await dbConnect();
                    const existingUser = await UserModel.findOne({ email: user.email });
                    if (!existingUser) {
                        // Generate a unique username for Google sign-in users with only letters, numbers and underscore
                        const baseUsername = user.email ? user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, "") : "user";
                        const uniqueUsername = `${baseUsername}${Math.floor(Math.random() * 10000)}`;

                        await UserModel.create({
                            username: uniqueUsername,
                            name: user.name,
                            email: user.email
                        });
                    }
                    return true;
                } catch (error) {
                    console.error("Error saving user", error);
                    return false;
                }
            }
            return true;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async session({ session }: any) {
            if (session.user?.email) {
                await dbConnect();
                const dbUser = await UserModel.findOne({ email: session.user.email });
                if (dbUser) {
                    session.user.id = dbUser._id.toString();
                    session.user.username = dbUser.username;
                }
            }
            return session;
        },
        async redirect({ baseUrl }: { baseUrl: string }) {
            return baseUrl;
        }
    },
    pages: {
        signIn: '/login',
    }
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };