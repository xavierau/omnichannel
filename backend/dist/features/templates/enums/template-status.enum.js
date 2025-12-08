"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateStatus = void 0;
/**
 * Template translation status values.
 *
 * These map to Meta's template status values.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#message_template_status_update
 */
var TemplateStatus;
(function (TemplateStatus) {
    TemplateStatus["APPROVED"] = "approved";
    TemplateStatus["PENDING"] = "pending";
    TemplateStatus["REJECTED"] = "rejected";
    TemplateStatus["DISABLED"] = "disabled";
    TemplateStatus["PAUSED"] = "paused";
    TemplateStatus["PENDING_DELETION"] = "pending_deletion";
    TemplateStatus["IN_APPEAL"] = "in_appeal";
    TemplateStatus["FLAGGED"] = "flagged";
    TemplateStatus["LIMIT_EXCEEDED"] = "limit_exceeded";
})(TemplateStatus || (exports.TemplateStatus = TemplateStatus = {}));
