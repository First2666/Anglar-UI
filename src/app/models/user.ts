export type UserRole = 'admin' | 'vet' | 'owner';

export type User = {
    id: string;
    username: string;
    password: string;
    fullName: string;
    email?: string;
    phone?: string;
    role: UserRole;
    linkedOwnerId?: string;
    linkedVetId?: string;
    createdAt: string; // ISO
    lastLoginAt?: string; // ISO
    loginCount?: number;
    isActive?: boolean;
};
