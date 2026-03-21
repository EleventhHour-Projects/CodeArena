import { Types } from "mongoose";

export interface Friend {
    _id: Types.ObjectId;
    user: Types.ObjectId;       // the owner of this friendships list entry
    friend: Types.ObjectId;     // the friend being added
    createdAt: Date;
}
