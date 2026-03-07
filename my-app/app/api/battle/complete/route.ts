import { NextResponse } from "next/server";
import mongoose from "mongoose";
import BattleModel from "@/lib/models/Battle";
import { UserModel } from "@/lib/models/User";
import dbConnect from "@/lib/dbConnect";
import { BattleDifficulty, ProblemRef } from "@/types/BattleType";

type ProblemResultPayload = {
    problem: ProblemRef;
    player1SolveTime?: number;
    player2SolveTime?: number;
};

export async function POST(req: Request) {
    await dbConnect();

    try {
        const body = await req.json();
        const { battleId, problemResults } = body;

        if (!battleId || !problemResults || !Array.isArray(problemResults)) {
            return NextResponse.json({ success: false, message: "Invalid request payload" }, { status: 400 });
        }

        const session = await mongoose.startSession();
        let finalResponse;

        await session.withTransaction(async () => {
            const battle = await BattleModel.findById(battleId).session(session);
            if (!battle) {
                throw new Error("Battle not found");
            }

            if (battle.status !== "Active") {
                throw new Error("Battle is already completed or inactive");
            }

            const player1 = await UserModel.findById(battle.player1).session(session);
            const player2 = await UserModel.findById(battle.player2).session(session);

            if (!player1 || !player2) {
                throw new Error("Players not found");
            }

            const basePoints = {
                easy: 100,
                medium: 200,
                hard: 300
            };
            const penaltyFactor = 20;

            let scoreA = 0;
            let scoreB = 0;

            const updatedProblemResults = [];

            for (const result of problemResults as ProblemResultPayload[]) {
                const { problem, player1SolveTime, player2SolveTime } = result;
                const difficulty = problem.difficulty as BattleDifficulty;
                const maxPoints = basePoints[difficulty] || 0;

                let p1Score = 0;
                let p2Score = 0;

                if (player1SolveTime && player1SolveTime > 0) {
                    p1Score = Math.max(0, maxPoints - (player1SolveTime / penaltyFactor));
                }
                if (player2SolveTime && player2SolveTime > 0) {
                    p2Score = Math.max(0, maxPoints - (player2SolveTime / penaltyFactor));
                }

                scoreA += p1Score;
                scoreB += p2Score;

                updatedProblemResults.push({
                    problem,
                    player1SolveTime: player1SolveTime || 0,
                    player2SolveTime: player2SolveTime || 0,
                });
            }

            let result: "player1" | "player2" | "draw" = "draw";
            if (scoreA > scoreB) {
                result = "player1";
            } else if (scoreB > scoreA) {
                result = "player2";
            }

            // Elo Rating Update
            const Ra = player1.rating || 0;
            const Rb = player2.rating || 0;

            const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
            const Eb = 1 / (1 + Math.pow(10, (Ra - Rb) / 400));

            const Sa = result === "player1" ? 1 : result === "draw" ? 0.5 : 0;
            const Sb = result === "player2" ? 1 : result === "draw" ? 0.5 : 0;

            const K = 40;

            const newRa = Math.round(Ra + K * (Sa - Ea));
            const newRb = Math.round(Rb + K * (Sb - Eb));

            // Battle Duration
            const endTime = new Date();
            const start = battle.startTime ? new Date(battle.startTime).getTime() : new Date(battle.createdAt).getTime();
            const durationMs = endTime.getTime() - start;
            const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
            
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const durationObj = { hours, minutes, seconds };

            battle.status = "Completed";
            battle.endTime = endTime;
            battle.duration = durationObj;
            battle.problemResults = updatedProblemResults;
            
            if (result === "player1") {
                battle.winner = player1._id;
                battle.loser = player2._id;
            } else if (result === "player2") {
                battle.winner = player2._id;
                battle.loser = player1._id;
            } else {
                battle.winner = undefined;
                battle.loser = undefined;
            }

            await battle.save({ session });

            // Time Math Helpers
            type TimeObj = { hours?: number; minutes?: number; seconds?: number } | null | undefined;
            const addTimes = (t1: TimeObj, t2: TimeObj) => {
                let s = (t1?.seconds || 0) + (t2?.seconds || 0);
                let m = (t1?.minutes || 0) + (t2?.minutes || 0) + Math.floor(s / 60);
                s = s % 60;
                const h = (t1?.hours || 0) + (t2?.hours || 0) + Math.floor(m / 60);
                m = m % 60;
                return { hours: h, minutes: m, seconds: s };
            };

            const convertToSeconds = (t: TimeObj) => (t?.hours || 0) * 3600 + (t?.minutes || 0) * 60 + (t?.seconds || 0);
            const getMinTime = (t1: TimeObj, t2: TimeObj) => {
                const s1 = convertToSeconds(t1);
                const s2 = convertToSeconds(t2);
                if (s1 === 0) return t2;
                if (s2 === 0) return t1;
                return s1 < s2 ? t1 : t2;
            };

            // Player 1 Update
            player1.rating = newRa;
            player1.battlesPlayed = (player1.battlesPlayed || 0) + 1;
            player1.totalTimeSpentInBattles = addTimes(player1.totalTimeSpentInBattles || { hours: 0, minutes: 0, seconds: 0 }, durationObj);
            player1.currentBattleId = null;

            if (result === "player1") {
                player1.battlesWon = (player1.battlesWon || 0) + 1;
                player1.currentStreak = (player1.currentStreak || 0) + 1;
                if (player1.currentStreak > (player1.longestStreak || 0)) {
                    player1.longestStreak = player1.currentStreak;
                }
                player1.fastestVictory = getMinTime(player1.fastestVictory || { hours: 0, minutes: 0, seconds: 0 }, durationObj);

                const prevTotalSeconds = (player1.battlesWon - 1) * convertToSeconds(player1.averageWinningTime || { hours: 0, minutes: 0, seconds: 0 });
                const newTotalSeconds = prevTotalSeconds + totalSeconds;
                const newAvgSeconds = Math.floor(newTotalSeconds / player1.battlesWon);
                player1.averageWinningTime = {
                    hours: Math.floor(newAvgSeconds / 3600),
                    minutes: Math.floor((newAvgSeconds % 3600) / 60),
                    seconds: Math.floor(newAvgSeconds % 60)
                };
            } else if (result === "player2") {
                player1.currentStreak = 0;
            }

            // Player 2 Update
            player2.rating = newRb;
            player2.battlesPlayed = (player2.battlesPlayed || 0) + 1;
            player2.totalTimeSpentInBattles = addTimes(player2.totalTimeSpentInBattles || { hours: 0, minutes: 0, seconds: 0 }, durationObj);
            player2.currentBattleId = null;

            if (result === "player2") {
                player2.battlesWon = (player2.battlesWon || 0) + 1;
                player2.currentStreak = (player2.currentStreak || 0) + 1;
                if (player2.currentStreak > (player2.longestStreak || 0)) {
                    player2.longestStreak = player2.currentStreak;
                }
                player2.fastestVictory = getMinTime(player2.fastestVictory || { hours: 0, minutes: 0, seconds: 0 }, durationObj);

                const prevTotalSeconds = (player2.battlesWon - 1) * convertToSeconds(player2.averageWinningTime || { hours: 0, minutes: 0, seconds: 0 });
                const newTotalSeconds = prevTotalSeconds + totalSeconds;
                const newAvgSeconds = Math.floor(newTotalSeconds / player2.battlesWon);
                player2.averageWinningTime = {
                    hours: Math.floor(newAvgSeconds / 3600),
                    minutes: Math.floor((newAvgSeconds % 3600) / 60),
                    seconds: Math.floor(newAvgSeconds % 60)
                };
            } else if (result === "player1") {
                player2.currentStreak = 0;
            }

            // Problems Solved Stats Update
            for (const res of updatedProblemResults) {
                const diff = res.problem.difficulty;
                if (!player1.totalProblemsSolved) player1.totalProblemsSolved = { easy: 0, medium: 0, hard: 0 };
                if (!player2.totalProblemsSolved) player2.totalProblemsSolved = { easy: 0, medium: 0, hard: 0 };
                
                if (res.player1SolveTime && res.player1SolveTime > 0) {
                    player1.totalProblemsSolved[diff] = (player1.totalProblemsSolved[diff] || 0) + 1;
                }
                if (res.player2SolveTime && res.player2SolveTime > 0) {
                    player2.totalProblemsSolved[diff] = (player2.totalProblemsSolved[diff] || 0) + 1;
                }
            }

            player1.markModified('totalTimeSpentInBattles');
            player1.markModified('fastestVictory');
            player1.markModified('averageWinningTime');
            player1.markModified('totalProblemsSolved');

            player2.markModified('totalTimeSpentInBattles');
            player2.markModified('fastestVictory');
            player2.markModified('averageWinningTime');
            player2.markModified('totalProblemsSolved');

            await player1.save({ session });
            await player2.save({ session });

            finalResponse = {
                success: true,
                message: "Battle completed successfully",
                result,
                scoreA,
                scoreB,
                newRa,
                newRb,
            };
        });

        session.endSession();

        return NextResponse.json(finalResponse, { status: 200 });
    } catch (error: unknown) {
        console.error("Battle completion error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to complete battle" },
            { status: 500 }
        );
    }
}
