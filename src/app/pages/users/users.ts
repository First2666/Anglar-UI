import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { AuthService, LoginHistoryEntry } from '../../services/auth.service';
import type { User } from '../../models/user';
import { Pets } from '../../data/pets';
import { MedicalRecords } from '../../data/medical-records';
import { SpeciesIconPipe } from '../../pipes/species-icon.pipe';

type Tab = 'users' | 'history';

@Component({
    selector: 'app-users',
    imports: [CommonModule, MatIconModule, MatTooltipModule, MatSnackBarModule, RouterLink, SpeciesIconPipe],
    templateUrl: './users.html',
    styleUrl: './users.scss',
})
export class Users implements OnInit {
    private readonly auth = inject(AuthService);
    private readonly snack = inject(MatSnackBar);
    private readonly petsData = inject(Pets);
    private readonly recordsData = inject(MedicalRecords);

    readonly activeTab = signal<Tab>('users');
    readonly users = signal<User[]>([]);
    readonly loginHistory = signal<LoginHistoryEntry[]>([]);
    readonly searchQuery = signal('');
    readonly confirmDeleteId = signal<string | null>(null);
    readonly filterRole = signal('all');
    readonly viewDetailId = signal<string | null>(null);

    readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? '');

    readonly roleOptions = [
        { value: 'all', label: 'ทุกบทบาท' },
        { value: 'admin', label: 'แอดมิน' },
        { value: 'vet', label: 'สัตวแพทย์' },
        { value: 'owner', label: 'เจ้าของสัตว์เลี้ยง' },
    ];

    readonly roleLabels: Record<string, string> = {
        admin: 'แอดมิน',
        vet: 'สัตวแพทย์',
        owner: 'เจ้าของสัตว์เลี้ยง',
    };

    readonly roleIcons: Record<string, string> = {
        admin: 'admin_panel_settings',
        vet: 'medical_services',
        owner: 'person',
    };

    readonly roleColors: Record<string, string> = {
        admin: '#f59e0b',
        vet: '#10b981',
        owner: '#8b5cf6',
    };

    readonly filteredUsers = computed(() => {
        const q = this.searchQuery().toLowerCase();
        const role = this.filterRole();
        return this.users().filter(u => {
            const matchSearch = !q || u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q);
            const matchRole = role === 'all' || u.role === role;
            return matchSearch && matchRole;
        });
    });

    readonly selectedUserDetails = computed(() => {
        const id = this.viewDetailId();
        if (!id) return null;
        const user = this.users().find(u => u.id === id);
        if (!user) return null;

        let petsOwned: any[] = [];
        if (user.role === 'owner') {
            const oId = user.linkedOwnerId ?? user.id;
            const pets = this.petsData.pets().filter(p => p.ownerId === oId);
            
            petsOwned = pets.map(p => {
                const records = this.recordsData.records().filter(r => r.petId === p.id);
                // sort by date desc
                records.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                return {
                    ...p,
                    recordCount: records.length,
                    lastVisit: records.length > 0 ? records[0].date : null,
                    records
                };
            });
        }

        return { user, petsOwned };
    });

    readonly recentHistory = computed(() =>
        [...this.loginHistory()].reverse().slice(0, 50)
    );

    readonly stats = computed(() => {
        const all = this.users();
        return {
            total: all.length,
            admin: all.filter(u => u.role === 'admin').length,
            vet: all.filter(u => u.role === 'vet').length,
            owner: all.filter(u => u.role === 'owner').length,
            active: all.filter(u => u.isActive !== false).length,
        };
    });

    ngOnInit() {
        this.refresh();
    }

    refresh() {
        this.users.set(this.auth.getAllUsers());
        this.loginHistory.set(this.auth.getLoginHistory());
    }

    setTab(tab: Tab) { this.activeTab.set(tab); }
    setFilter(role: string) { this.filterRole.set(role); }
    setSearch(q: string) { this.searchQuery.set(q); }

    askDelete(id: string) { this.confirmDeleteId.set(id); }
    cancelDelete() { this.confirmDeleteId.set(null); }
    openDetail(id: string) { this.viewDetailId.set(id); }
    closeDetail() { this.viewDetailId.set(null); }

    confirmDelete() {
        const id = this.confirmDeleteId();
        if (!id) return;
        const ok = this.auth.deleteUser(id);
        if (ok) {
            this.snack.open('ลบผู้ใช้สำเร็จ', 'ปิด', { duration: 3000 });
            this.refresh();
        } else {
            this.snack.open('ไม่สามารถลบผู้ใช้ที่กำลังใช้งานอยู่ได้', 'ปิด', { duration: 3000 });
        }
        this.confirmDeleteId.set(null);
    }

    getDeleteTarget(): User | null {
        const id = this.confirmDeleteId();
        return id ? this.users().find(u => u.id === id) ?? null : null;
    }

    formatDate(iso?: string): string {
        if (!iso) return '-';
        return new Intl.DateTimeFormat('th-TH', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        }).format(new Date(iso));
    }

    formatDateOnly(dateStr?: string): string {
        if (!dateStr) return '-';
        return new Intl.DateTimeFormat('th-TH', {
            day: '2-digit', month: 'short', year: 'numeric'
        }).format(new Date(dateStr));
    }

    getDuration(entry: LoginHistoryEntry): string {
        if (!entry.logoutAt) return 'กำลังใช้งาน';
        const ms = new Date(entry.logoutAt).getTime() - new Date(entry.loginAt).getTime();
        const mins = Math.floor(ms / 60000);
        if (mins < 1) return 'น้อยกว่า 1 นาที';
        if (mins < 60) return `${mins} นาที`;
        return `${Math.floor(mins / 60)} ชั่วโมง ${mins % 60} นาที`;
    }
}
