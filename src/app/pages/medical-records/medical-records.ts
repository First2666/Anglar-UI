import { NgClass, DecimalPipe, SlicePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MedicalRecords as MedicalRecordsStore } from '../../data/medical-records';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TemplateRef, ViewChild } from '@angular/core';
import { Owners } from '../../data/owners';
import { Pets } from '../../data/pets';
import { Vets } from '../../data/vets';
import { Appointments } from '../../data/appointments';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { newId } from '../../models/ids';
import { ConfirmDialogComponent } from '../../components/shared/confirm-dialog/confirm-dialog';

interface BillRow {
  id: string;
  name: string;
  price: number;
}

@Component({
    selector: 'app-medical-records',
    imports: [
        ReactiveFormsModule, DecimalPipe, SlicePipe,
        MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
        MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule,
        MatMenuModule, MatDatepickerModule, MatNativeDateModule, MatDialogModule,
    ],
    templateUrl: './medical-records.html',
    styleUrl: './medical-records.scss',
})
export class MedicalRecordsPage {
    private readonly fb = inject(FormBuilder);
    private readonly recordsStore = inject(MedicalRecordsStore);
    private readonly ownersStore = inject(Owners);
    private readonly petsStore = inject(Pets);
    private readonly vetsStore = inject(Vets);
    private readonly apptStore = inject(Appointments);
    private readonly snack = inject(MatSnackBar);
    readonly dialog = inject(MatDialog);
    readonly auth = inject(AuthService);
    private readonly route = inject(ActivatedRoute);
    @ViewChild('formDialog') formDialogTemplate!: TemplateRef<any>;

    readonly editingId = signal<string | null>(null);
    readonly expandedId = signal<string | null>(null);
    readonly searchQuery = signal('');

    toggleExpand(id: string) {
        this.expandedId.update(curr => curr === id ? null : id);
    }

    // Stores context when opening from an appointment
    readonly linkedAppt = signal<{
        apptId: string; petName: string; ownerName: string;
        vetName: string; reason: string;
    } | null>(null);

    // Billing rows for the form
    readonly billRows = signal<BillRow[]>([]);
    readonly billTotal = computed(() => this.billRows().reduce((s, r) => s + (Number(r.price) || 0), 0));

    readonly owners = computed(() => this.ownersStore.owners());
    readonly pets = computed(() => this.petsStore.pets());
    readonly vets = computed(() => this.vetsStore.vets());
    readonly appointments = computed(() => this.apptStore.appointments());
    readonly records = computed(() => this.recordsStore.records());

    readonly ownerNameById = computed(() => new Map(this.owners().map((o) => [o.id, o.fullName] as const)));
    readonly petNameById = computed(() => new Map(this.pets().map((p) => [p.id, p.name] as const)));
    readonly vetNameById = computed(() => new Map(this.vets().map((v) => [v.id, v.fullName] as const)));

    readonly petsForOwner = computed(() => {
        const ownerId = this.form.controls.ownerId.value;
        return ownerId ? this.pets().filter((p) => p.ownerId === ownerId) : this.pets();
    });

    readonly filteredRecords = computed(() => {
        let list = this.records();

        if (this.auth.role === 'owner') {
            const ownerId = this.auth.linkedOwnerId;
            list = list.filter(r => {
                if (r.ownerId !== ownerId) return false;
                if (!r.appointmentId) return true;
                const appt = this.apptStore.getById(r.appointmentId);
                if (appt && appt.billItems && appt.billItems.length > 0) {
                    return appt.paymentStatus === 'Paid';
                }
                return true;
            });
        }

        const q = this.searchQuery().toLowerCase();
        if (!q) return list;
        return list.filter(
            (r) =>
                (this.petNameById().get(r.petId) ?? '').toLowerCase().includes(q) ||
                r.subjective.toLowerCase().includes(q) ||
                r.assessment.toLowerCase().includes(q) ||
                r.plan.toLowerCase().includes(q)
        );
    });

    readonly form = this.fb.nonNullable.group({
        ownerId: ['', [Validators.required]],
        petId: ['', [Validators.required]],
        vetId: [''],
        appointmentId: [''],
        date: [new Date().toISOString().slice(0, 10), [Validators.required]],
        subjective: ['', [Validators.required, Validators.minLength(2)]],
        objective: ['', [Validators.required, Validators.minLength(2)]],
        assessment: ['', [Validators.required, Validators.minLength(2)]],
        plan: ['', [Validators.required, Validators.minLength(2)]],
        weight: ['' as unknown as number],
        temperature: ['' as unknown as number],
        heartRate: ['' as unknown as number],
        respiratoryRate: ['' as unknown as number],
    });

    constructor() {
        this.ownersStore.ensureSeed();
        this.vetsStore.ensureSeed();
        effect(() => {
            const ownerIds = this.owners().map((o) => o.id);
            if (ownerIds.length >= 2) this.petsStore.ensureSeed(ownerIds);
            if (!this.form.controls.ownerId.value && ownerIds[0]) {
                this.form.controls.ownerId.setValue(ownerIds[0]);
            }
        });
        effect(() => {
            const pets = this.petsForOwner();
            if (pets.length > 0 && !this.form.controls.petId.value) {
                this.form.controls.petId.setValue(pets[0]!.id);
            }
        });
        effect(() => {
            const pets = this.pets();
            const vets = this.vets();
            if (pets[0] && pets[0].ownerId) {
                this.recordsStore.ensureSeed(pets[0].id, pets[0].ownerId, vets[0]?.id);
            }
        });
        effect(() => {
            const id = this.editingId();
            if (!id) return;
            const rec = this.recordsStore.getById(id);
            if (!rec) return;
            this.form.patchValue({
                ownerId: rec.ownerId,
                petId: rec.petId,
                vetId: rec.vetId ?? '',
                appointmentId: rec.appointmentId ?? '',
                date: rec.date,
                subjective: rec.subjective,
                objective: rec.objective,
                assessment: rec.assessment,
                plan: rec.plan,
                weight: rec.weight ?? ('' as unknown as number),
                temperature: rec.temperature ?? ('' as unknown as number),
                heartRate: rec.heartRate ?? ('' as unknown as number),
                respiratoryRate: rec.respiratoryRate ?? ('' as unknown as number),
            });
            // Load existing bill if linked to appointment
            if (rec.appointmentId) {
                const appt = this.apptStore.getById(rec.appointmentId);
                if (appt?.billItems?.length) {
                    this.billRows.set(appt.billItems.map(b => ({ id: b.id, name: b.name, price: b.price })));
                }
            }
        });

        this.route.queryParams.subscribe(params => {
            if (params['apptId']) {
                setTimeout(() => {
                   this.startCreateFromAppt(params['apptId']);
                }, 100);
            }
        });
    }

    // ────── Open Form ──────

    startCreate() {
        this.editingId.set(null);
        this.linkedAppt.set(null);
        this.billRows.set([]);
        const firstOwnerId = this.owners()[0]?.id ?? '';
        const firstPetId = this.pets().find((p) => p.ownerId === firstOwnerId)?.id ?? '';
        const defaultVetId = this.auth.role === 'vet' ? (this.auth.linkedVetId ?? '') : '';
        this.form.reset({
            ownerId: firstOwnerId,
            petId: firstPetId,
            vetId: defaultVetId,
            appointmentId: '',
            date: new Date().toISOString().slice(0, 10),
            subjective: '', objective: '', assessment: '', plan: '',
            weight: '' as unknown as number,
            temperature: '' as unknown as number,
            heartRate: '' as unknown as number,
            respiratoryRate: '' as unknown as number,
        });
        this.dialog.open(this.formDialogTemplate, { panelClass: 'minimal-dialog', width: '90vw', maxWidth: '860px' });
    }

    startEdit(id: string) {
        this.editingId.set(id);
        this.linkedAppt.set(null);
        this.billRows.set([]);
        this.dialog.open(this.formDialogTemplate, { panelClass: 'minimal-dialog', width: '90vw', maxWidth: '860px' });
    }

    startCreateFromAppt(apptId: string) {
        const appt = this.apptStore.getById(apptId);
        if (!appt) return;

        this.editingId.set(null);

        // Store a display-friendly context so we can show a patient card
        this.linkedAppt.set({
            apptId: appt.id,
            petName: this.petNameById().get(appt.petId) ?? '—',
            ownerName: this.ownerNameById().get(appt.ownerId) ?? '—',
            vetName: appt.vetId ? (this.vetNameById().get(appt.vetId) ?? '—') : '—',
            reason: appt.reason,
        });

        // Pre-fill bill rows with default visit fee
        const existingBill = appt.billItems?.length ? appt.billItems.map(b => ({id: b.id, name: b.name, price: b.price})) : [];
        this.billRows.set(existingBill.length > 0 ? existingBill : [
            { id: newId('bi'), name: 'ค่าตรวจวินิจฉัย', price: 200 },
        ]);

        const defaultVetId = appt.vetId ?? (this.auth.role === 'vet' ? (this.auth.linkedVetId ?? '') : '');
        this.form.reset({
            ownerId: appt.ownerId,
            petId: appt.petId,
            vetId: defaultVetId,
            appointmentId: appt.id,
            date: new Date().toISOString().slice(0, 10),
            subjective: appt.reasonDetails
                ? `เหตุผลที่มา: ${appt.reason}\nรายละเอียด: ${appt.reasonDetails}`
                : `เหตุผลที่มา: ${appt.reason}`,
            objective: '', assessment: '', plan: '',
            weight: '' as unknown as number,
            temperature: '' as unknown as number,
            heartRate: '' as unknown as number,
            respiratoryRate: '' as unknown as number,
        });

        this.dialog.open(this.formDialogTemplate, { panelClass: 'minimal-dialog', width: '90vw', maxWidth: '860px' });
    }

    closeForm() {
        this.dialog.closeAll();
        this.editingId.set(null);
        this.linkedAppt.set(null);
    }

    // ────── Billing Management ──────

    addBillRow() {
        this.billRows.update(rows => [...rows, { id: newId('bi'), name: '', price: 0 }]);
    }

    removeBillRow(id: string) {
        this.billRows.update(rows => rows.filter(r => r.id !== id));
    }

    updateBillRowName(id: string, value: string) {
        this.billRows.update(rows => rows.map(r => r.id === id ? { ...r, name: value } : r));
    }

    updateBillRowPrice(id: string, value: string) {
        this.billRows.update(rows => rows.map(r => r.id === id ? { ...r, price: Number(value) || 0 } : r));
    }

    // ────── Save ──────

    save() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        const validBillRows = this.billRows().filter(r => r.name.trim());

        // Save the medical record
        const id = this.recordsStore.upsert({
            id: this.editingId() ?? undefined,
            ownerId: raw.ownerId,
            petId: raw.petId,
            vetId: raw.vetId || undefined,
            appointmentId: raw.appointmentId || undefined,
            date: raw.date,
            subjective: raw.subjective,
            objective: raw.objective,
            assessment: raw.assessment,
            plan: raw.plan,
            weight: Number(raw.weight) || undefined,
            temperature: Number(raw.temperature) || undefined,
            heartRate: Number(raw.heartRate) || undefined,
            respiratoryRate: Number(raw.respiratoryRate) || undefined,
        });

        // If linked to appointment → update status to Completed
        if (raw.appointmentId) {
            const appt = this.apptStore.getById(raw.appointmentId);
            if (appt) {
                this.apptStore.upsert({
                    ...appt,
                    status: 'Completed',
                    // Only update billing if there are new items
                    ...(validBillRows.length > 0 ? {
                        billItems: validBillRows,
                        totalCost: validBillRows.reduce((s, r) => s + (Number(r.price) || 0), 0),
                        paymentStatus: appt.paymentStatus === 'Paid' ? 'Paid' : 'Pending',
                    } : {})
                });
            }
        }

        this.editingId.set(id);
        this.closeForm();

        this.snack.open(
            validBillRows.length > 0 ? '✓ บันทึกการรักษาและส่งใบแจ้งหนี้ไปยังเจ้าของแล้ว' : '✓ บันทึกการรักษาสำเร็จ',
            'ตกลง', { duration: 3000 }
        );
    }


    remove(id: string) {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            width: '400px',
            data: {
                title: 'ยืนยันการลบประวัติ',
                message: 'คุณแน่ใจหรือไม่ว่าต้องการลบประวัตินี้?',
                confirmText: 'ลบข้อมูล',
                icon: 'delete_outline',
                iconColor: '#f44336'
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.recordsStore.remove(id);
                if (this.expandedId() === id) this.expandedId.set(null);
                this.snack.open('✓ ลบข้อมูลสำเร็จ', 'ตกลง', { duration: 1500 });
            }
        });
    }

    ownerName(id: string) { return this.ownerNameById().get(id) ?? 'ไม่ทราบ'; }
    petName(id: string) { return this.petNameById().get(id) ?? 'ไม่ทราบ'; }
    vetName(id: string) { return id ? (this.vetNameById().get(id) ?? '—') : '—'; }
    handleAction(action: string) { this.snack.open(`✓ ${action}สำเร็จ`, 'ตกลง', { duration: 1500 }); }
}
