"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configurePassport = configurePassport;
const passport_1 = __importDefault(require("passport"));
const local_strategy_1 = require("@features/auth/strategies/local.strategy");
const jwt_strategy_1 = require("@features/auth/strategies/jwt.strategy");
function configurePassport() {
    // Register strategies
    passport_1.default.use('local', new local_strategy_1.LocalStrategy());
    passport_1.default.use('jwt', new jwt_strategy_1.JwtStrategy());
    return passport_1.default;
}
