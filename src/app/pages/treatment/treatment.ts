import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ToastService } from '../../services/toast.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { Appointments } from '../../data/appointments';
import { MedicalRecords as MedicalRecordsStore } from '../../data/medical-records';
import { Pets } from '../../data/pets';
import { Owners } from '../../data/owners';
import { AuthService } from '../../services/auth.service';
import { newId } from '../../models/ids';

interface BillRow {
  id: string;
  name: string;
  price: number;
}

@Component({
  selector: 'app-treatment',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, DecimalPipe,
    MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatTooltipModule, MatDividerModule
  ],
  templateUrl: './treatment.html',
  styleUrl: './treatment.scss'
})
export class TreatmentComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  public readonly route = inject(ActivatedRoute);
  public readonly router = inject(Router);
  private readonly apptStore = inject(Appointments);
  private readonly recordsStore = inject(MedicalRecordsStore);
  private readonly petsStore = inject(Pets);
  private readonly ownersStore = inject(Owners);
  public readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly apptId = signal<string | null>(null);
  readonly appt = computed(() => {
    const id = this.apptId();
    return id ? this.apptStore.getById(id) : null;
  });

  readonly pet = computed(() => {
    const a = this.appt();
    return a ? this.petsStore.getById(a.petId) : null;
  });

  readonly owner = computed(() => {
    const p = this.pet();
    return p ? this.ownersStore.getById(p.ownerId) : null;
  });

  readonly history = computed(() => {
    const p = this.pet();
    if (!p) return [];
    return this.recordsStore.getByPetId(p.id).sort((a, b) => b.date.localeCompare(a.date));
  });

  readonly billRows = signal<BillRow[]>([]);
  readonly billTotal = computed(() => this.billRows().reduce((s, r) => s + (Number(r.price) || 0), 0));

  readonly form = this.fb.nonNullable.group({
    weight: ['' as unknown as number],
    temperature: ['' as unknown as number],
    heartRate: ['' as unknown as number],
    respiratoryRate: ['' as unknown as number],
    subjective: ['', [Validators.required, Validators.minLength(2)]],
    objective: ['', [Validators.required, Validators.minLength(2)]],
    assessment: ['', [Validators.required, Validators.minLength(2)]],
    plan: ['', [Validators.required, Validators.minLength(2)]],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('apptId');
    if (id) {
      this.apptId.set(id);
      const appt = this.appt();
      if (appt) {
        // Pre-fill form if there's reason info
        this.form.patchValue({
          subjective: `เหตุผลที่มา: ${appt.reason}\n${appt.reasonDetails ? 'รายละเอียด: ' + appt.reasonDetails : ''}`
        });

        // Default visit fee
        this.billRows.set([
          { id: newId('bi'), name: 'ค่าตรวจวินิจฉัยพื้นฐาน', price: 200 }
        ]);

        // Auto check-in if not already
        if (appt.status === 'Scheduled' || appt.status === 'Pending') {
          this.apptStore.upsert({ ...appt, status: 'CheckedIn' });
        }
      } else {
        this.toast.info('ไม่พบนัดหมายนี้');
        this.router.navigate(['/appointments']);
      }
    }
  }

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

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('กรุณากรอกข้อมูล SOAP ให้ครบถ้วน');
      return;
    }

    const appt = this.appt();
    const pet = this.pet();
    if (!appt || !pet) {
      this.toast.error('ไม่พบข้อมูลนัดหมายหรือสัตว์เลี้ยง');
      return;
    }

    const raw = this.form.getRawValue();
    const validBillRows = this.billRows().filter(r => r.name.trim());

    // 1. Save Medical Record
    this.recordsStore.upsert({
      petId: pet.id,
      ownerId: pet.ownerId,
      vetId: this.auth.linkedVetId || undefined,
      appointmentId: appt.id,
      date: new Date().toISOString().slice(0, 10),
      subjective: raw.subjective,
      objective: raw.objective,
      assessment: raw.assessment,
      plan: raw.plan,
      weight: Number(raw.weight) || undefined,
      temperature: Number(raw.temperature) || undefined,
      heartRate: Number(raw.heartRate) || undefined,
      respiratoryRate: Number(raw.respiratoryRate) || undefined,
    });

    // 2. Complete Appointment & Add Billing
    this.apptStore.upsert({
      ...appt,
      status: 'Completed',
      billItems: validBillRows,
      totalCost: validBillRows.reduce((s, r) => s + (Number(r.price) || 0), 0),
      paymentStatus: 'Pending',
    });

    this.toast.success('บันทึกการรักษาและส่งใบแจ้งหนี้เรียบร้อยแล้ว');
    this.router.navigate(['/appointments']);
  }

  calculateAge(birthDate?: string): string {
    if (!birthDate) return '—';
    const birth = new Date(birthDate);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    return `${years} ปี ${months} เดือน`;
  }
}
