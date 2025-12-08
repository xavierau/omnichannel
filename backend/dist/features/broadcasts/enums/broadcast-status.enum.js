"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastStatus = void 0;
var BroadcastStatus;
(function (BroadcastStatus) {
    BroadcastStatus["DRAFT"] = "draft";
    BroadcastStatus["SCHEDULED"] = "scheduled";
    BroadcastStatus["SENDING"] = "sending";
    BroadcastStatus["COMPLETED"] = "completed";
    BroadcastStatus["PAUSED"] = "paused";
    BroadcastStatus["CANCELLED"] = "cancelled";
    BroadcastStatus["FAILED"] = "failed";
})(BroadcastStatus || (exports.BroadcastStatus = BroadcastStatus = {}));
