import { NextResponse } from "next/server";
import mongoose from "mongoose";
import BattleModel from "@/lib/models/Battle";
import { UserModel } from "@/lib/models/User";
import SubmissionModel from "@/lib/models/Submission";
import ExecutionCodeModel from "@/lib/models/ExecutionCode"; // added to ensure model is registered for populate
import dbConnect from "@/lib/dbConnect";
import { BattleDifficulty, ProblemRef } from "@/types/BattleType";

export async function POST(req: Request) {
    await dbConnect();

    try {
        const body = await req.json();
        const { battleId, resultOverride } = body;

        if (!battleId) {
            return NextResponse.json({ success: false, message: "Missing battleId" }, { status: 400 });
        }

        const session = await mongoose.startSession();
        let finalResponse;

        await session.withTransaction(async () => {
            const battle = await BattleModel.findById(battleId).session(session);
            if (!battle) {
                throw new Error("Battle not found");
            }

            if (battle.status !== "Active") {
                // Determine scores from saved problemResults
                let sA = 0;
                let sB = 0;
                (battle.problemResults || []).forEach((pr: any) => {
                    const diff = (pr.problem?.difficulty || "easy").toLowerCase() as BattleDifficulty;
                    const max = diff === "easy" ? 100 : diff === "medium" ? 200 : 300;
                    if (pr.player1SolveTime > 0) sA += Math.max(0, max - (pr.player1SolveTime / 20));
                    if (pr.player2SolveTime > 0) sB += Math.max(0, max - (pr.player2SolveTime / 20));
                });

                // Always fetch players to construct final response payload if they were passed over
                const p1 = await UserModel.findById(battle.player1).session(session);
                const p2 = await UserModel.findById(battle.player2).session(session);

                // If rating fields are missing (battle completed before schema update), recalculate and persist
                if (battle.ratingChangeA == null || battle.ratingChangeB == null) {
                    if (p1 && p2) {
                        const Ra = p1.rating ?? 0;
                        const Rb = p2.rating ?? 0;
                        const winResult = battle.winner
                            ? (battle.winner.toString() === battle.player1.toString() ? "player1" : "player2")
                            : "draw";
                        const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
                        const Eb = 1 / (1 + Math.pow(10, (Ra - Rb) / 400));
                        const Sa = winResult === "player1" ? 1 : winResult === "draw" ? 0.5 : 0;
                        const Sb = winResult === "player2" ? 1 : winResult === "draw" ? 0.5 : 0;
                        const K = 40;
                        const newRa = Math.round(Ra + K * (Sa - Ea));
                        const newRb = Math.round(Rb + K * (Sb - Eb));
                        battle.ratingChangeA = newRa - Ra;
                        battle.ratingChangeB = newRb - Rb;
                        battle.newRatingA = newRa;
                        battle.newRatingB = newRb;
                        await battle.save({ session });
                    }
                }

                let p1SolvedCount = 0;
                let p2SolvedCount = 0;
                let p1SolveTimes: Record<string, number> = {};
                let p2SolveTimes: Record<string, number> = {};
                
                (battle.problemResults || []).forEach((pr: any) => {
                    if (pr.player1SolveTime > 0) {
                        p1SolvedCount++;
                        p1SolveTimes[pr.problem?.id || pr.problem] = pr.player1SolveTime;
                    }
                    if (pr.player2SolveTime > 0) {
                        p2SolvedCount++;
                        p2SolveTimes[pr.problem?.id || pr.problem] = pr.player2SolveTime;
                    }
                });

                finalResponse = {
                    success: true,
                    message: "Battle already completed",
                    result: battle.winner ? (battle.winner.toString() === battle.player1.toString() ? "player1" : "player2") : "draw",
                    scoreA: sA,
                    scoreB: sB,
                    ratingChangeA: battle.ratingChangeA ?? 0,
                    ratingChangeB: battle.ratingChangeB ?? 0,
                    newRa: battle.newRatingA ?? 0,
                    newRb: battle.newRatingB ?? 0,
                    player1: {
                        username: p1?.username || "Player 1",
                        solvedCount: p1SolvedCount,
                        solveTimes: p1SolveTimes
                    },
                    player2: {
                        username: p2?.username || "Player 2",
                        solvedCount: p2SolvedCount,
                        solveTimes: p2SolveTimes
                    },
                    duration: battle.duration || (() => {
                        if (battle.startTime && battle.endTime) {
                            const totalSeconds = Math.max(0, Math.floor((new Date(battle.endTime).getTime() - new Date(battle.startTime).getTime()) / 1000));
                            return {
                                hours: Math.floor(totalSeconds / 3600),
                                minutes: Math.floor((totalSeconds % 3600) / 60),
                                seconds: totalSeconds % 60
                            };
                        }
                        return { hours: 0, minutes: 0, seconds: 0 };
                    })(),
                    problemResults: battle.problemResults,
                    battle: battle
                };
                return;
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

            // --- Server-side Result Calculation ---
            // Fetch all accepted submissions for this battle
            const submissionsRaw = await SubmissionModel.find({
                battleId: new mongoose.Types.ObjectId(battleId),
                status: "Accepted"
            })
            .populate({
                path: "execCodeId",
                match: { type: "Submit" }
            })
            .sort({ createdAt: 1 }).session(session);

            const submissions = submissionsRaw.filter(sub => sub.execCodeId !== null);

            const battleStart = battle.startTime ? new Date(battle.startTime).getTime() : new Date(battle.createdAt).getTime();

            // Store first accepted solve time (in seconds from start) per user per problem
            const solveTimes: Record<string, Record<number, number>> = {
                [player1._id.toString()]: {},
                [player2._id.toString()]: {}
            };

            submissions.forEach(sub => {
                const uid = sub.userId.toString();
                const pid = sub.problem.id;
                if (solveTimes[uid] && solveTimes[uid][pid] === undefined) {
                    const solveTimeSec = Math.max(0, Math.floor((new Date(sub.createdAt).getTime() - battleStart) / 1000));
                    solveTimes[uid][pid] = solveTimeSec;
                }
            });

            let scoreA = 0;
            let scoreB = 0;
            const updatedProblemResults: any[] = [];

            // Iterate over the problems assigned to this battle
            for (const prob of battle.problems) {
                const pid = prob.id;
                const difficulty = prob.difficulty.toLowerCase() as BattleDifficulty;
                const maxPoints = basePoints[difficulty] || 0;

                const p1SolveTime = solveTimes[player1._id.toString()][pid] || 0;
                const p2SolveTime = solveTimes[player2._id.toString()][pid] || 0;

                let p1Score = 0;
                let p2Score = 0;

                if (p1SolveTime > 0) {
                    p1Score = Math.max(0, maxPoints - (p1SolveTime / penaltyFactor));
                }
                if (p2SolveTime > 0) {
                    p2Score = Math.max(0, maxPoints - (p2SolveTime / penaltyFactor));
                }

                scoreA += p1Score;
                scoreB += p2Score;

                updatedProblemResults.push({
                    problem: { id: prob.id, difficulty: prob.difficulty },
                    player1SolveTime: p1SolveTime,
                    player2SolveTime: p2SolveTime,
                });
            }

            // --- Determine Winner ---
            let result: "player1" | "player2" | "draw" = "draw";
            if (resultOverride) {
                result = resultOverride;
            } else {
                if (scoreA > scoreB) {
                    result = "player1";
                } else if (scoreB > scoreA) {
                    result = "player2";
                }
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
            const ratingChangeA = newRa - Ra;
            const ratingChangeB = newRb - Rb;

            // Battle Duration
            const endTime = new Date();
            const durationMs = endTime.getTime() - battleStart;
            const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
            
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const durationObj = { hours, minutes, seconds };

            battle.status = "Completed";
            battle.endTime = endTime;
            battle.duration = durationObj;
            console.log("Saving battle problemResults:", updatedProblemResults);
            battle.problemResults = updatedProblemResults;
            battle.markModified('problemResults');
            
            battle.ratingChangeA = ratingChangeA;
            battle.ratingChangeB = ratingChangeB;
            battle.newRatingA = newRa;
            battle.newRatingB = newRb;
            
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

            // --- Problems Solved Stats Update ---
            for (const res of updatedProblemResults) {
                const diff = (res.problem.difficulty || "easy").toLowerCase() as "easy" | "medium" | "hard";
                if (!player1.totalProblemsSolved) player1.totalProblemsSolved = { easy: 0, medium: 0, hard: 0 };
                if (!player2.totalProblemsSolved) player2.totalProblemsSolved = { easy: 0, medium: 0, hard: 0 };
                
                if (res.player1SolveTime > 0) {
                    player1.totalProblemsSolved[diff] = (player1.totalProblemsSolved[diff] || 0) + 1;
                }
                if (res.player2SolveTime > 0) {
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
                ratingChangeA,
                ratingChangeB,
                duration: durationObj,
                player1: {
                    username: player1.username,
                    solvedCount: Object.values(solveTimes[player1._id.toString()]).length,
                    solveTimes: solveTimes[player1._id.toString()]
                },
                player2: {
                    username: player2.username,
                    solvedCount: Object.values(solveTimes[player2._id.toString()]).length,
                    solveTimes: solveTimes[player2._id.toString()]
                },
                problemResults: updatedProblemResults
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
