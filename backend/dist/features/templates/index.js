"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateRoutes = exports.TemplateController = exports.TemplateService = exports.TemplateRepository = exports.TemplateTranslation = exports.WhatsAppTemplateGroup = void 0;
// Entities
var template_group_entity_1 = require("./template-group.entity");
Object.defineProperty(exports, "WhatsAppTemplateGroup", { enumerable: true, get: function () { return template_group_entity_1.WhatsAppTemplateGroup; } });
var template_translation_entity_1 = require("./template-translation.entity");
Object.defineProperty(exports, "TemplateTranslation", { enumerable: true, get: function () { return template_translation_entity_1.TemplateTranslation; } });
// Enums
__exportStar(require("./enums"), exports);
// DTOs
__exportStar(require("./dto"), exports);
// Repository
var template_repository_1 = require("./template.repository");
Object.defineProperty(exports, "TemplateRepository", { enumerable: true, get: function () { return template_repository_1.TemplateRepository; } });
// Service
var template_service_1 = require("./template.service");
Object.defineProperty(exports, "TemplateService", { enumerable: true, get: function () { return template_service_1.TemplateService; } });
// Controller
var template_controller_1 = require("./template.controller");
Object.defineProperty(exports, "TemplateController", { enumerable: true, get: function () { return template_controller_1.TemplateController; } });
// Presenter
__exportStar(require("./template.presenter"), exports);
// Routes
var template_routes_1 = require("./template.routes");
Object.defineProperty(exports, "templateRoutes", { enumerable: true, get: function () { return __importDefault(template_routes_1).default; } });
