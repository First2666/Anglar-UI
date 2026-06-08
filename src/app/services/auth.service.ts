import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import type { User, UserRole } from '../models/user';
import { Owners } from '../data/owners';
import { Vets } from '../data/vets';
import { Pets } from '../data/pets';
import { Appointments } from '../data/appointments';

const STORAGE_KEY_USERS = 'petClinic.users.v1';
const STORAGE_KEY_SESSION = 'petClinic.session.v1';
const STORAGE_KEY_HISTORY = 'petClinic.loginHistory.v1';

export type LoginHistoryEntry = {
    userId: string;
    username: string;
    fullName: string;
    role: UserRole;
    loginAt: string; // ISO
    logoutAt?: string; // ISO
};

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly router = inject(Router);
    private readonly ownersStore = inject(Owners);
    private readonly vetsStore = inject(Vets);
    private readonly petsStore = inject(Pets);
    private readonly apptStore = inject(Appointments);

    private readonly _currentUser = signal<User | null>(null);
    readonly currentUser = this._currentUser.asReadonly();
    readonly isLoggedIn = computed(() => !!this._currentUser());

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            this.ensureSeedUsers();
            this.restoreSession();
        }
    }

    // ── Storage helpers ──────────────────────────────────────────────────────
    getUsers(): User[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_USERS);
            return raw ? (JSON.parse(raw) as User[]) : [];
        } catch {
            return [];
        }
    }

    private saveUsers(users: User[]) {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    }

    getLoginHistory(): LoginHistoryEntry[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
            return raw ? (JSON.parse(raw) as LoginHistoryEntry[]) : [];
        } catch {
            return [];
        }
    }

    private saveLoginHistory(history: LoginHistoryEntry[]) {
        // keep last 200 entries
        const trimmed = history.slice(-200);
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(trimmed));
    }

    // ── Seed ─────────────────────────────────────────────────────────────────
    private ensureSeedUsers() {
        if (this.getUsers().length > 0) return;

        this.ownersStore.ensureSeed();
        this.vetsStore.ensureSeed();

        const owners = this.ownersStore.owners();
        const vets = this.vetsStore.vets();

        const now = new Date().toISOString();
        const seedUsers: User[] = [
            {
                id: 'user_admin',
                username: 'admin',
                password: 'admin123',
                fullName: 'ผู้ดูแลระบบ',
                email: 'admin@vetcare.com',
                role: 'admin',
                isActive: true,
                loginCount: 0,
                createdAt: now,
            },
            {
                id: 'user_vet',
                username: 'dr.araya',
                password: 'vet123',
                fullName: 'Dr. Araya Sirikul',
                email: 'araya@vetcare.com',
                role: 'vet',
                linkedVetId: vets.find(v => v.fullName.includes('Araya'))?.id,
                isActive: true,
                loginCount: 0,
                createdAt: now,
            },
            {
                id: 'user_owner',
                username: 'somchai',
                password: 'own123',
                fullName: 'Somchai Prasert',
                email: 'somchai@example.com',
                role: 'owner',
                linkedOwnerId: owners[0]?.id,
                isActive: true,
                loginCount: 0,
                createdAt: now,
            },
        ];
        this.saveUsers(seedUsers);
    }

    private restoreSession() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SESSION);
            if (!raw) return;
            const userId = JSON.parse(raw) as string;
            const user = this.getUsers().find((u) => u.id === userId);
            if (user) this._currentUser.set(user);
        } catch {
            // ignore
        }
    }

    // ── Auth Actions ─────────────────────────────────────────────────────────
    login(username: string, password: string): boolean {
        const users = this.getUsers();
        const user = users.find(
            (u) => u.username === username && u.password === password
        );
        if (!user) return false;

        // update login stats
        const now = new Date().toISOString();
        const updated = users.map(u =>
            u.id === user.id
                ? { ...u, lastLoginAt: now, loginCount: (u.loginCount ?? 0) + 1 }
                : u
        );
        this.saveUsers(updated);

        // record history
        const history = this.getLoginHistory();
        history.push({ userId: user.id, username: user.username, fullName: user.fullName, role: user.role, loginAt: now });
        this.saveLoginHistory(history);

        const freshUser = { ...user, lastLoginAt: now, loginCount: (user.loginCount ?? 0) + 1 };
        this._currentUser.set(freshUser);
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user.id));
        return true;
    }

    logout() {
        // record logout time
        const current = this._currentUser();
        if (current) {
            const history = this.getLoginHistory();
            const entryIndex = [...history].reverse().findIndex(h => h.userId === current.id && !h.logoutAt);
            if (entryIndex !== -1) {
                // translate reverse index back to original index
                const originalIndex = history.length - 1 - entryIndex;
                history[originalIndex].logoutAt = new Date().toISOString();
                this.saveLoginHistory(history);
            }
        }
        this._currentUser.set(null);
        localStorage.removeItem(STORAGE_KEY_SESSION);
        this.router.navigate(['/login']);
    }

    register(data: {
        username: string;
        password: string;
        fullName: string;
        email?: string;
        phone?: string;
        role: UserRole;
    }): { success: boolean; error?: string } {
        // Auto-Title Case
        const formattedName = data.fullName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

        const users = this.getUsers();

        if (users.some(u => u.username === data.username)) {
            return { success: false, error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' };
        }
        if (data.email && users.some(u => u.email === data.email)) {
            return { success: false, error: 'อีเมลนี้ถูกใช้งานแล้ว' };
        }

        let linkedOwnerId: string | undefined;
        let linkedVetId: string | undefined;

        if (data.role === 'owner') {
            linkedOwnerId = this.ownersStore.upsert({
                fullName: formattedName,
                email: data.email,
                phone: data.phone,
            });

            // Onboarding: Create a 'Welcome Pet' for new owners
            const petId = this.petsStore.upsert({
                name: 'Lucky',
                species: 'Dog',
                breed: 'Golden Retriever',
                sex: 'Male',
                ownerId: linkedOwnerId,
                notes: 'Welcome to VetCare Pro!',
                neutered: true,
            });

            // Onboarding: Create a sample 'General Checkup' appointment
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            nextWeek.setHours(10, 0, 0, 0);

            this.apptStore.upsert({
                petId,
                ownerId: linkedOwnerId,
                startAt: nextWeek.toISOString(),
                durationMinutes: 30,
                reason: 'General Checkup',
                status: 'Scheduled',
                notes: 'Initial checkup for new owner.'
            });

        } else if (data.role === 'vet') {
            linkedVetId = this.vetsStore.upsert({
                fullName: formattedName,
                email: data.email,
                phone: data.phone,
                specialty: 'General Practice',
                available: true,
            });
        }

        const newUser: User = {
            id: 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            username: data.username,
            password: data.password,
            fullName: formattedName,
            email: data.email,
            phone: data.phone,
            role: data.role,
            linkedOwnerId,
            linkedVetId,
            isActive: true,
            loginCount: 0,
            createdAt: new Date().toISOString(),
        };

        this.saveUsers([...users, newUser]);
        return { success: true };
    }

    registerWithLink(data: {
        username: string;
        password: string;
        fullName: string;
        role: UserRole;
        linkedVetId?: string;
        linkedOwnerId?: string;
    }): { success: boolean; error?: string } {
        const users = this.getUsers();

        if (users.some(u => u.username === data.username)) {
            return { success: false, error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' };
        }

        const newUser: User = {
            id: 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            username: data.username,
            password: data.password,
            fullName: data.fullName,
            role: data.role,
            linkedOwnerId: data.linkedOwnerId,
            linkedVetId: data.linkedVetId,
            isActive: true,
            loginCount: 0,
            createdAt: new Date().toISOString(),
        };

        this.saveUsers([...users, newUser]);
        return { success: true };
    }

    getUserByVetId(vetId: string): User | undefined {
        return this.getUsers().find(u => u.linkedVetId === vetId);
    }

    upsertUserForVet(vetId: string, data: { username: string, password: string, fullName: string }): { success: boolean; error?: string } {
        const users = this.getUsers();
        const existingIdx = users.findIndex(u => u.linkedVetId === vetId);
        
        if (existingIdx >= 0) {
            if (users[existingIdx].username !== data.username && users.some(u => u.username === data.username)) {
                return { success: false, error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' };
            }
            users[existingIdx] = {
                ...users[existingIdx],
                username: data.username,
                password: data.password,
                fullName: data.fullName
            };
            this.saveUsers(users);
            return { success: true };
        } else {
            return this.registerWithLink({
                username: data.username,
                password: data.password,
                fullName: data.fullName,
                role: 'vet',
                linkedVetId: vetId
            });
        }
    }

    // ── Admin: User Management ─────────────────────────────────────────────
    getAllUsers(): User[] {
        return this.getUsers();
    }

    deleteUser(userId: string): boolean {
        const current = this._currentUser();
        if (current?.id === userId) return false; // cannot delete self
        const users = this.getUsers().filter(u => u.id !== userId);
        this.saveUsers(users);
        return true;
    }

    toggleUserActive(userId: string): void {
        const users = this.getUsers().map(u =>
            u.id === userId ? { ...u, isActive: !(u.isActive ?? true) } : u
        );
        this.saveUsers(users);
    }

    // ── Role helpers ──────────────────────────────────────────────────────────
    hasRole(...roles: UserRole[]): boolean {
        const user = this._currentUser();
        if (!user) return false;
        return roles.includes(user.role);
    }

    get role(): UserRole | null {
        return this._currentUser()?.role ?? null;
    }

    get fullName(): string {
        return this._currentUser()?.fullName ?? '';
    }

    get linkedOwnerId(): string | undefined {
        return this._currentUser()?.linkedOwnerId;
    }

    get linkedVetId(): string | undefined {
        return this._currentUser()?.linkedVetId;
    }
}
