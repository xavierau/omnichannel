import { UserStatus } from '../user.entity';
export declare class UpdateUserDto {
    firstName?: string;
    lastName?: string;
    status?: UserStatus;
}
export declare class UpdatePasswordDto {
    newPassword: string;
    currentPassword: string;
}
export declare class UserRolesDto {
    roleIds: string[];
}
