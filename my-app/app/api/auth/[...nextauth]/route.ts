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
        async signIn({ user, account, profile }: any) {
            if (account?.provider === "google") {
                try {
                    await dbConnect();
                    const existingUser = await UserModel.findOne({ email: user.email });
                    
                    const imageUrl = user.image || profile?.picture || "";

                    if (!existingUser) {
                        // Generate a unique username for Google sign-in users with only letters, numbers and underscore
                        const baseUsername = user.email ? user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, "") : "user";
                        const uniqueUsername = `${baseUsername}${Math.floor(Math.random() * 10000)}`;

                        await UserModel.create({
                            username: uniqueUsername,
                            name: user.name,
                            email: user.email,
                            image: imageUrl
                        });
                    } else if (imageUrl && existingUser.image !== imageUrl) {
                        // Update image if it changed
                        await UserModel.updateOne({ email: user.email }, { $set: { image: imageUrl } });
                    }
                    return true;
                } catch (error) {
                    console.error("Error saving user", error);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user, profile, account }: any) {
            if (user) {
                token.id = user.id;
            }
            if (account?.provider === "google" && profile?.picture) {
                token.picture = profile.picture;
            }
            return token;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async session({ session, token }: any) {
            if (session.user?.email) {
                await dbConnect();
                
                // If the token has a picture, ensure session.user.image has it
                if (token?.picture) {
                    session.user.image = token.picture;
                }

                const dbUser = await UserModel.findOne({ email: session.user.email });
                if (dbUser) {
                    session.user.id = dbUser._id.toString();
                    session.user.username = dbUser.username;
                    session.user.rating = dbUser.rating;
                    if (dbUser.image) {
                        session.user.image = dbUser.image;
                    } else if (session.user.image) {
                        // Retrofit existing users who don't have an image in DB yet
                        await UserModel.updateOne({ email: session.user.email }, { $set: { image: session.user.image } });
                    }
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