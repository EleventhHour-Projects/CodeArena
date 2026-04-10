import { Types } from "mongoose";

export type executionStatus = "Pending" | "Executing"; 
export type executionType = "Run" | "Submit";
type BattleProblem = {
    difficulty: "easy" | "medium" | "hard";
    id: number;
};
export interface ExecutionCode {
    _id: Types.ObjectId;
    code: string;
    language?: string;
    userId: Types.ObjectId;
    battleId: Types.ObjectId;
    problem: BattleProblem;
    testcases?: { input: string; output: string }[];
    status: executionStatus;
    result: {
        status: string;
        output: string;
        errorMsg: string;
        failed_test_case: string;
        expected_output: string;
        actual_output: string;
    };
    type: executionType;
    createdAt: Date;
}