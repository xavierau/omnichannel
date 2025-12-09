"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const passport_jwt_1 = require("passport-jwt");
const tsyringe_1 = require("tsyringe");
const user_service_1 = require("../../users/user.service");
const redis_config_1 = require("../../../config/redis.config");
const constants_1 = require("../../../config/constants");
class JwtStrategy extends passport_jwt_1.Strategy {
    constructor() {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_ACCESS_SECRET,
            ignoreExpiration: false,
        }, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (payload, done) => {
            try {
                const cacheKey = `user:${payload.sub}`;
                // Try to get user from Redis cache
                const cached = await redis_config_1.redisClient.get(cacheKey);
                if (cached) {
                    const user = JSON.parse(cached);
                    // Check user status from cache
                    if (user.status !== 'active') {
                        return done(null, false);
                    }
                    return done(null, user);
                }
                // Cache miss - query database
                const userService = tsyringe_1.container.resolve(user_service_1.UserService);
                const user = await userService.findById(payload.sub);
                if (!user) {
                    return done(null, false);
                }
                if (user.status !== 'active') {
                    return done(null, false);
                }
                // Cache the user for future requests (5 minutes TTL)
                await redis_config_1.redisClient.setex(cacheKey, constants_1.AUTH_CONSTANTS.USER_CACHE_TTL_SECONDS, JSON.stringify(user));
                return done(null, user);
            }
            catch (error) {
                return done(error, false);
            }
        });
    }
}
exports.JwtStrategy = JwtStrategy;
