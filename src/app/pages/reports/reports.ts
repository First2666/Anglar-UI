import { NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Component, computed, effect, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Appointments } from '../../data/appointments';
import { Pets } from '../../data/pets';
import { Owners } from '../../data/owners';
import { Vets } from '../../data/vets';
import { MedicalRecords } from '../../data/medical-records';
import { Products } from '../../data/products';

interface BarItem { label: string; value: number; pct: number; }

@Component({
    selector: 'app-reports',
    imports: [MatCardModule, MatIconModule, MatSnackBarModule, NgClass, MatTooltipModule, MatButtonModule],
    templateUrl: './reports.html',
    styleUrl: './reports.scss',
})
export class Reports {
    private readonly apptStore = inject(Appointments);
    private readonly petsStore = inject(Pets);
    private readonly ownersStore = inject(Owners);
    private readonly vetsStore = inject(Vets);
    private readonly recordsStore = inject(MedicalRecords);
    private readonly productsStore = inject(Products);
    private readonly snack = inject(MatSnackBar);

    readonly appointments = computed(() => this.apptStore.appointments());
    readonly pets = computed(() => this.petsStore.pets());
    readonly vets = computed(() => this.vetsStore.vets());
    readonly records = computed(() => this.recordsStore.records());
    readonly products = computed(() => this.productsStore.products());

    constructor() {
        this.ownersStore.ensureSeed();
        this.vetsStore.ensureSeed();
        effect(() => {
            const ownerIds = this.ownersStore.owners().map((o) => o.id);
            if (ownerIds.length >= 2) this.petsStore.ensureSeed(ownerIds);
        });
        effect(() => {
            const pet = this.pets()[0];
            if (pet) {
                const vet = this.vets()[0];
                this.apptStore.ensureSeed(pet.id, pet.ownerId, vet?.id);
                this.recordsStore.ensureSeed(pet.id, pet.ownerId, vet?.id);
            }
        });
    }

    readonly statusCounts = computed(() => {
        const counts = { Scheduled: 0, CheckedIn: 0, InSession: 0, Completed: 0, Cancelled: 0 };
        for (const a of this.appointments()) {
            if (counts[a.status as keyof typeof counts] !== undefined) {
                 counts[a.status as keyof typeof counts]++;
            }
        }
        return counts;
    });

    readonly statusBars = computed<BarItem[]>(() => {
        const c = this.statusCounts();
        const total = this.appointments().length || 1;
        return [
            { label: 'Scheduled', value: c.Scheduled, pct: Math.round((c.Scheduled / total) * 100) },
            { label: 'Checked In', value: c.CheckedIn, pct: Math.round((c.CheckedIn / total) * 100) },
            { label: 'In Session', value: c.InSession, pct: Math.round((c.InSession / total) * 100) },
            { label: 'Completed', value: c.Completed, pct: Math.round((c.Completed / total) * 100) },
            { label: 'Cancelled', value: c.Cancelled, pct: Math.round((c.Cancelled / total) * 100) },
        ];
    });

    readonly speciesBars = computed<BarItem[]>(() => {
        const map = new Map<string, number>();
        for (const p of this.pets()) map.set(p.species, (map.get(p.species) ?? 0) + 1);
        const total = this.pets().length || 1;
        return [...map.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => ({ label, value, pct: Math.round((value / total) * 100) }));
    });

    readonly monthlyBars = computed<BarItem[]>(() => {
        const now = new Date();
        const months: { label: string; key: string }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                label: d.toLocaleDateString('en-US', { month: 'short' }),
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            });
        }
        const counts = new Map<string, number>(months.map((m) => [m.key, 0]));
        for (const a of this.appointments()) {
            const key = new Date(a.startAt).toISOString().slice(0, 7);
            if (counts.has(key)) counts.set(key, counts.get(key)! + 1);
        }
        const max = Math.max(...counts.values(), 1);
        return months.map((m) => ({
            label: m.label,
            value: counts.get(m.key) ?? 0,
            pct: Math.round(((counts.get(m.key) ?? 0) / max) * 100),
        }));
    });

    readonly completionRate = computed(() => {
        const total = this.appointments().length;
        if (!total) return 0;
        const done = this.appointments().filter((a) => a.status === 'Completed').length;
        return Math.round((done / total) * 100);
    });

    readonly thisMonthCount = computed(() => {
        const key = new Date().toISOString().slice(0, 7);
        return this.appointments().filter((a) => a.startAt.startsWith(key)).length;
    });

    readonly categoryBars = computed<BarItem[]>(() => {
        const map = new Map<string, number>();
        for (const p of this.products()) {
            map.set(p.category, (map.get(p.category) ?? 0) + 1);
        }
        const total = this.products().length || 1;
        return [...map.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => ({ label, value, pct: Math.round((value / total) * 100) }));
    });

    statusThai(s: string) {
        const map: Record<string, string> = { Scheduled: 'รอนัดหมาย', CheckedIn: 'รอตรวจ (เช็คอิน)', 'Checked In': 'รอตรวจ (เช็คอิน)', InSession: 'กำลังตรวจ', 'In Session': 'กำลังตรวจ', Completed: 'เสร็จสิ้น', Cancelled: 'ยกเลิก' };
        return map[s] ?? s;
    }

    speciesThai(s: string) {
        const map: Record<string, string> = { Dog: 'สุนัข', Cat: 'แมว', Bird: 'นก', Rabbit: 'กระต่าย', Other: 'อื่นๆ' };
        return map[s] ?? s;
    }

    specialtyThai(s: string) {
        const map: Record<string, string> = { 'General Practice': 'เวชกรรมทั่วไป', 'Surgery': 'ศัลยกรรม', 'Dermatology': 'ผิวหนัง', 'Dentistry': 'ทันตกรรม', 'Cardiology': 'โรคหัวใจ', 'Oncology': 'มะเร็งวิทยา', 'Other': 'อื่นๆ' };
        return map[s] ?? s;
    }

    categoryThai(s: string) {
        const map: Record<string, string> = { 'Food': 'อาหาร', 'Toys': 'ของเล่น', 'Accessories': 'อุปกรณ์', 'Supplements': 'อาหารเสริม', 'Other': 'อื่นๆ' };
        return map[s] ?? s;
    }

    handleAction(action: string) {
        this.snack.open(`✓ ${action}สำเร็จ`, 'ตกลง', { duration: 1500 });
    }
}