import { Role } from '../roles/role.entity';
export declare enum PermissionResource {
    BROADCASTS = "broadcasts",
    CUSTOMERS = "customers",
    TEMPLATES = "templates",
    CONVERSATIONS = "conversations",
    USERS = "users",
    SETTINGS = "settings",
    API_KEYS = "api_keys",
    CHANNELS = "channels",
    CUSTOM_FIELDS = "custom_fields",
    NOTES = "notes",
    TEAMS = "teams",
    INBOX = "inbox"
}
export declare enum PermissionAction {
    CREATE = "create",
    READ = "read",
    UPDATE = "update",
    DELETE = "delete",
    MANAGE = "manage",// Full control (implies all above)
    MESSAGE = "message",// Send messages (inbox-specific)
    ASSIGN = "assign",// Assign/pickup conversations (inbox-specific)
    NOTE = "note"
}
export declare enum PermissionScope {
    ALL = "all",
    OWN = "own"
}
export declare class Permission {
    id: string;
    resource: PermissionResource;
    action: PermissionAction;
    scope: PermissionScope;
    description: string | null;
    roles: Role[];
    createdAt: Date;
    updatedAt: Date;
    toString(): string;
}
