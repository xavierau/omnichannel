import { User as UserEntity } from '@features/users/user.entity';

declare global {
  namespace Express {
    // Extend the passport User interface with our User entity properties
    interface User extends UserEntity {}

    interface Request {
      user?: User;
      userPermissions?: string[];
    }
  }
}

export {};
