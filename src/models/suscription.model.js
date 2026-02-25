import mongoose, { Schema } from "mongoose";

const SuscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, // One Who Is Subscribing
        ref: "User",
    },
    channel: {
        type: Schema.Types.ObjectId, // One Who Is Being Subscribed To
        ref: "User",
    }

},{timestamps: true})


export const Subscription = mongoose.model("Subscription", SuscriptionSchema)