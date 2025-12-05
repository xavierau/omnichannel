import { Strategy as PassportJwtStrategy, ExtractJwt } from 'passport-jwt';
import { container } from 'tsyringe';
import { UserService } from '@features/users/user.service';
import { redisClient } from '@config/redis.config';
import { AUTH_CONSTANTS } from '@config/constants';
import { User } from '@features/users/user.entity';

interface JwtPayload {
  sub: string;
  email: string;
}

export class JwtStrategy extends PassportJwtStrategy {
  constructor() {
    super(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_ACCESS_SECRET!,
        ignoreExpiration: false,
      },
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
