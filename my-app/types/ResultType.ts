// result collection - submissionID, Status - Accepted/Rejected, ReasonOfRejection

import { Types } from "mongoose";

export type ResultStatus = "Accepted" | "Rejected";

export interface Result {
    _id: Types.ObjectId;
    submissionId: Types.ObjectId;
    status: ResultStatus;
    tle: boolean;
    mle: boolean;
    failedTestCaseNumber: number | null;
}
