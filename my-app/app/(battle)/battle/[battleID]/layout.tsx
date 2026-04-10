import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import BattleModel from "@/lib/models/Battle";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function BattleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ battleID: string }>;
}) {
  const resolvedParams = await params;
  const battleID = resolvedParams.battleID;

  // Retrieve user session server-side
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !(session.user as any).id) {
    redirect("/login");
  }

  await dbConnect();
  
  // Verify battle exists
  const battle = await BattleModel.findById(battleID).lean();
  if (!battle) {
    redirect("/");
  }

  const userId = (session.user as any).id;
  
  // Authorize player 1 or player 2
  if (battle.player1?.toString() !== userId && battle.player2?.toString() !== userId) {
    redirect("/"); // Unauthorized players are redirected
  }

  return <>{children}</>;
}
