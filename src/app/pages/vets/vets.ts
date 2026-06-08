import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { thaiPhoneValidator } from '../../validators/pet-validators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ToastService } from '../../services/toast.service';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TemplateRef, ViewChild } from '@angular/core';
import { Vets as VetsStore } from '../../data/vets';
import { AuthService } from '../../services/auth.service';
import type { VetSpecialty } from '../../models/vet';

@Component({
    selector: 'app-vets',
    imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule, MatSlideToggleModule, MatTooltipModule, MatDialogModule],
    templateUrl: './vets.html',
    styleUrl: './vets.scss',
})
export class Vets {
    private readonly fb = inject(FormBuilder);
    private readonly vetsStore = inject(VetsStore);
    private readonly auth = inject(AuthService);
    private readonly toast = inject(ToastService);
    readonly dialog = inject(MatDialog);

    @ViewChild('formDialog') formDialogTemplate!: TemplateRef<any>;

    readonly editingId = signal<string | null>(null);
    readonly searchQuery = signal('');

    readonly vets = computed(() => this.vetsStore.vets());

    readonly filteredVets = computed(() => {
        const q = this.searchQuery().toLowerCase();
        if (!q) return this.vets();
        return this.vets().filter(
            (v) =>
                v.fullName.toLowerCase().includes(q) ||
                v.specialty.toLowerCase().includes(q) ||
                (v.email ?? '').toLowerCase().includes(q)
        );
    });

    readonly displayedColumns = ['fullName', 'specialty', 'phone', 'available', 'actions'] as const;
    readonly specialtyOptions: readonly VetSpecialty[] = [
        'General Practice',
        'Surgery',
        'Dermatology',
        'Dentistry',
        'Cardiology',
        'Oncology',
        'Other',
    ] as const;

    readonly form = this.fb.nonNullable.group({
        fullName: ['', [Validators.required, Validators.minLength(2)]],
        specialty: this.fb.nonNullable.control<VetSpecialty>('General Practice', [Validators.required]),
        phone: ['', [thaiPhoneValidator()]],
        email: ['', [Validators.email]],
        available: [true],
        username: [''],
        password: [''],
    });

    constructor() {
        this.vetsStore.ensureSeed();

        effect(() => {
            const id = this.editingId();
            if (!id) return;
            const vet = this.vetsStore.getById(id);
            if (!vet) return;
            const user = this.auth.getUserByVetId(id);
            this.form.patchValue({
                fullName: vet.fullName,
                specialty: vet.specialty,
                phone: vet.phone ?? '',
                email: vet.email ?? '',
                available: vet.available,
                username: user?.username ?? '',
                password: user?.password ?? '',
            });
        });
    }

    startCreate() {
        this.editingId.set(null);
        this.form.reset({ fullName: '', specialty: 'General Practice', phone: '', email: '', available: true, username: '', password: '' });
        this.dialog.open(this.formDialogTemplate, { panelClass: 'minimal-dialog', width: '90vw', maxWidth: '600px' });
    }

    startEdit(id: string) {
        this.editingId.set(id);
        this.dialog.open(this.formDialogTemplate, { panelClass: 'minimal-dialog', width: '90vw', maxWidth: '600px' });
    }

    closeForm() {
        this.dialog.closeAll();
        this.editingId.set(null);
    }

    save() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const raw = this.form.getRawValue();
        const id = this.vetsStore.upsert({
            id: this.editingId() ?? undefined,
            fullName: raw.fullName,
            specialty: raw.specialty,
            phone: raw.phone,
            email: raw.email,
            available: raw.available,
        });
        
        if (raw.username && raw.password) {
            const res = this.auth.upsertUserForVet(id, {
                username: raw.username,
                password: raw.password,
                fullName: raw.fullName
            });
            if (!res.success) {
                this.toast.error(`ข้อผิดพลาดบัญชี: ${res.error}`);
            } else {
                this.toast.success('บันทึกข้อมูลและบัญชีเข้าสู่ระบบแล้ว');
            }
        } else {
            this.toast.success('บันทึกข้อมูลสัตวแพทย์แล้ว');
        }

        this.editingId.set(id);
        this.closeForm(); // Hide form after saving
    }

    remove(id: string) {
        this.vetsStore.remove(id);
        if (this.editingId() === id) this.startCreate();
        this.toast.success('ลบข้อมูลสัตวแพทย์แล้ว');
    }

    specialtyThai(s: string) {
        const map: Record<string, string> = {
            'General Practice': 'เวชกรรมทั่วไป',
            'Surgery': 'ศัลยกรรม',
            'Dermatology': 'ผิวหนัง',
            'Dentistry': 'ทันตกรรม',
            'Cardiology': 'โรคหัวใจ',
            'Oncology': 'มะเร็งวิทยา',
            'Other': 'อื่นๆ',
        };
        return map[s] ?? s;
    }
}
