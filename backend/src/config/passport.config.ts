import passport from 'passport';
import { LocalStrategy } from '@features/auth/strategies/local.strategy';
import { JwtStrategy } from '@features/auth/strategies/jwt.strategy';

export function configurePassport() {
  // Register strategies
  passport.use('local', new LocalStrategy());
  passport.use('jwt', new JwtStrategy());

  return passport;
}
