import { User as UserEntity } from '@features/users/user.entity';

declare global {
  namespace Express {
    // Extend the passport User interface with our User entity properties
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends UserEntity {}

    interface Request {
      user?: User;
      userPermissions?: string[];
    }
  }
}

export {};
