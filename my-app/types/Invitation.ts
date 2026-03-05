import { Types } from "mongoose";
import { User } from "./UserType";
export type InvitationStatus = "Accepted" | "Rejected" | "Pending" | "Expired";
export type InvitationDifficulty = "Easy" | "Medium" | "Hard";

export interface Invitation {
    _id: Types.ObjectId;
    player1: User;
    player2: User;
    status: InvitationStatus;
    createdAt: Date;
    difficulty: InvitationDifficulty; 
    expiresAt: Date;
}