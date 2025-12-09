import { Strategy as PassportJwtStrategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';
import { container } from 'tsyringe';
import { UserService } from '@features/users/user.service';
import { redisClient } from '@config/redis.config';
import { AUTH_CONSTANTS } from '@config/constants';
import { User } from '@features/users/user.entity';

interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * Custom JWT extractor that checks both:
 * 1. Authorization header (Bearer token) - for regular API calls
 * 2. Query parameter 'token' - for SSE connections (EventSource can't send headers)
 */
function extractJwtFromHeaderOrQuery(req: Request): string | null {
  // First try Authorization header
  const headerToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (headerToken) {
    return headerToken;
  }

  // Fall back to query parameter for SSE
  if (req.query && req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
}

export class JwtStrategy extends PassportJwtStrategy {
  constructor() {
    super(
      {
        jwtFromRequest: extractJwtFromHeaderOrQuery,
        secretOrKey: process.env.JWT_ACCESS_SECRET!,
        ignoreExpiration: false,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (payload: JwtPayload, done: any) => {
        try {
          const cacheKey = `user:${payload.sub}`;

          // Try to get user from Redis cache
          const cached = await redisClient.get(cacheKey);
          if (cached) {
            const user = JSON.parse(cached) as User;

            // Check user status from cache
            if (user.status !== 'active') {
              return done(null, false);
            }

            return done(null, user);
          }

          // Cache miss - query database
          const userService = container.resolve(UserService);
          const user = await userService.findById(payload.sub);

          if (!user) {
            return done(null, false);
          }

          if (user.status !== 'active') {
            return done(null, false);
          }

          // Cache the user for future requests (5 minutes TTL)
          await redisClient.setex(
            cacheKey,
            AUTH_CONSTANTS.USER_CACHE_TTL_SECONDS,
            JSON.stringify(user)
          );

          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    );
  }
}
