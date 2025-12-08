export declare class CreateInvitationDto {
    email: string;
}
export declare class AcceptInvitationDto {
    password: string;
    firstName: string;
    lastName: string;
}
export declare class ValidateInvitationDto {
    token: string;
}
export declare class ResendInvitationDto {
    email: string;
}
export interface InvitationResponseDto {
    id: string;
    email: string;
    status: string;
    inviterName: string;
    tenantName: string;
    expiresAt: string;
    createdAt: string;
}
export interface ValidateInvitationResponseDto {
    valid: boolean;
    email?: string;
    tenantName?: string;
    inviterName?: string;
    expiresAt?: string;
}
