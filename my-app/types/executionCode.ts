import { Types } from "mongoose";

export type executionStatus = "Pending" | "Executing" | "Accepted" | "Rejected"; 
export type executionType = "Run" | "Submit" | "Custom" | "NonHidden" | "All" | "Verify";
export type CodeType = "normal" | "battle" | "test";

type BattleProblem = {
    difficulty?: "easy" | "medium" | "hard" | string;
    id?: number;
};

export interface ExecutionCode {
    _id: Types.ObjectId;
    code: string;
    codeType?: CodeType;
    language?: string;
    userId: Types.ObjectId;
    battleId?: Types.ObjectId;
    problem?: BattleProblem;
    testcases?: { input: string; output: string; is_hidden?: boolean }[];
    status: executionStatus;
    result?: {
        status?: string;
        output?: string;
        errorMsg?: string;
        failed_test_case?: string;
        failedTestCaseNumber?: string;
        expected_output?: string;
        expectedOutput?: string;
        actual_output?: string;
        actualOutput?: string;
        tle?: boolean;
        mle?: boolean;
        runTimeMs?: number;
        memoryUsedMB?: number;
        isHidden?: boolean;
        passedCount?: number;
        totalCount?: number;
    };
    type: executionType;
    createdAt: Date;
}