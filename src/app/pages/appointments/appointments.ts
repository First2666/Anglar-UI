import { Component, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { newId } from '../../models/ids';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastService } from '../../services/toast.service';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TemplateRef, ViewChild } from '@angular/core';
import { Appointments as AppointmentsStore } from '../../data/appointments';
import { Owners } from '../../data/owners';
import { Pets } from '../../data/pets';
import { Vets } from '../../data/vets';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import type { AppointmentStatus, AppointmentReason } from '../../models/appointment';

@Component({
  selector: 'app-appointments',
  imports: [DecimalPipe, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatTableModule, MatTooltipModule, MatDatepickerModule, MatNativeDateModule, MatDialogModule],
  templateUrl: './appointments.html',
  styleUrl: './appointments.scss',
})
export class Appointments {
  private readonly fb = inject(FormBuilder);
  private readonly ownersStore = inject(Owners);
  private readonly petsStore = inject(Pets);
  private readonly vetsStore = inject(Vets);
  private readonly apptStore = inject(AppointmentsStore);
  private readonly toast = inject(ToastService);
  readonly dialog = inject(MatDialog);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  @ViewChild('formDialog') formDialogTemplate!: TemplateRef<any>;
  @ViewChild('billingDialog') billingDialogTemplate!: TemplateRef<any>;

  readonly editingId = signal<string | null>(null);
  readonly billingId = signal<string | null>(null);
  readonly billItems = signal<{ id: string, name: string, price: number }[]>([]);
  readonly billTotal = computed(() => this.billItems().reduce((sum, item) => sum + (+item.price || 0), 0));

  readonly statusFilter = signal<AppointmentStatus | 'All'>('All');
  readonly searchQuery = signal('');
  readonly selectedPeriod = signal<'morning' | 'afternoon' | 'evening'>('morning');
  
  readonly step = signal<1 | 2 | 3>(1);
  readonly reasonOptions: readonly AppointmentReason[] = [
    'Annual Vaccination', 'Illness / Injury', 'General Checkup', 'Follow-up', 'Dental', 'Surgery', 'Other'
  ];

  /** Everyone can book (create). Owners can create & edit their own. Staff can edit all. */
  readonly canBook = computed(() => true); // All logged-in users can book
  readonly canEditAll = computed(() => this.auth.hasRole('admin', 'vet'));
  readonly canDelete = computed(() => this.auth.hasRole('admin'));
  readonly isOwner = computed(() => this.auth.role === 'owner');

  readonly owners = computed(() => this.ownersStore.owners());
  readonly pets = computed(() => this.petsStore.pets());
  readonly vets = computed(() => this.vetsStore.vets());
  readonly appointments = computed(() => this.apptStore.appointments());

  /** Only show available vets for booking */
  readonly availableVets = computed(() => this.vets().filter(v => v.available));

  readonly ownerNameById = computed(() => new Map(this.owners().map((o) => [o.id, o.fullName] as const)));
  readonly petNameById = computed(() => new Map(this.pets().map((p) => [p.id, p.name] as const)));
  readonly vetNameById = computed(() => new Map(this.vets().map((v) => [v.id, v.fullName] as const)));

  readonly stats = computed(() => {
    let baseList = this.appointments();
    if (this.auth.role === 'owner') {
      const ownerId = this.auth.linkedOwnerId;
      baseList = ownerId ? baseList.filter((a) => a.ownerId === ownerId) : [];
    } else if (this.auth.role === 'vet') {
      const vetId = this.auth.linkedVetId;
      baseList = vetId ? baseList.filter((a) => a.vetId === vetId) : [];
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    return {
      total: baseList.length,
      todayCount: baseList.filter(a => a.startAt.startsWith(todayStr)).length,
      upcomingCount: baseList.filter(a => a.status === 'Scheduled').length,
      completedCount: baseList.filter(a => a.status === 'Completed').length,
    };
  });

  readonly filteredAppointments = computed(() => {
    let list = [...this.appointments()].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));

    // Owner: only see own appointments
    if (this.auth.role === 'owner') {
      const ownerId = this.auth.linkedOwnerId;
      if (ownerId) list = list.filter((a) => a.ownerId === ownerId);
      else list = [];
    }

    // Vet: only see assigned appointments
    if (this.auth.role === 'vet') {
      const vetId = this.auth.linkedVetId;
      if (vetId) list = list.filter((a) => a.vetId === vetId);
      else list = [];
    }

    const sf = this.statusFilter();
    if (sf !== 'All') list = list.filter((a) => a.status === sf);
    
    const q = this.searchQuery().toLowerCase();
    if (q) {
      list = list.filter(a => 
         (this.petNameById().get(a.petId) ?? '').toLowerCase().includes(q) ||
         (this.ownerNameById().get(a.ownerId) ?? '').toLowerCase().includes(q) ||
         a.reason.toLowerCase().includes(q) ||
         (this.vetNameById().get(a.vetId || '') ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  });

  readonly displayedColumns = computed(() => {
    if (this.auth.role === 'owner') {
      return ['startAt', 'pet', 'reason', 'vet', 'status', 'actions'] as const;
    }
    return ['startAt', 'owner', 'pet', 'reason', 'vet', 'status', 'actions'] as const;
  });

  readonly statusOptions: readonly AppointmentStatus[] = ['Pending', 'Scheduled', 'CheckedIn', 'Completed', 'Cancelled'] as const;
  readonly filterOptions: readonly (AppointmentStatus | 'All')[] = ['All', ...this.statusOptions];

  /** Owner sees only own pets; staff sees pets of selected owner */
  readonly petsForSelectedOwner = computed(() => {
    if (this.auth.role === 'owner') {
      const ownerId = this.auth.linkedOwnerId;
      return ownerId ? this.pets().filter((p) => p.ownerId === ownerId) : [];
    }
    const ownerId = this.form.controls.ownerId.value;
    return this.pets().filter((p) => p.ownerId === ownerId);
  });

  readonly form = this.fb.nonNullable.group({
    ownerId: ['', [Validators.required]],
    petId: ['', [Validators.required]],
    vetId: ['', [Validators.required]],
    date: [new Date().toISOString().slice(0, 10), [Validators.required]],
    timeSlot: ['', [Validators.required]],
    reason: this.fb.nonNullable.control<AppointmentReason>('General Checkup', [Validators.required]),
    reasonDetails: [''],
    status: this.fb.nonNullable.control<AppointmentStatus>(this.auth.role === 'owner' ? 'Pending' : 'Scheduled', [Validators.required]),
    diagnosis: [''],
    notes: [''],
  });

  readonly availableSlots = computed(() => {
    const vetId = this.form.controls.vetId.value || '';
    const date = this.form.controls.date.value || '';
    if (!date) return [];
    
    // Generate slots: 09:00 to 18:30 every 30 mins (Extended for evening)
    const slots = [];
    for (let h = 9; h <= 18; h++) {
       slots.push(`${pad2(h)}:00`);
       if (h !== 18) slots.push(`${pad2(h)}:30`);
    }

    if (!vetId) return slots;

    const booked = this.appointments().filter(a => a.vetId === vetId && a.startAt.startsWith(date) && a.id !== this.editingId());
    const bookedTimes = booked.map(a => new Date(a.startAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));

    return slots.filter(s => !bookedTimes.includes(s));
  });

  readonly categorizedSlots = computed(() => {
    const all = this.availableSlots();
    return {
      morning: all.filter(s => parseInt(s.split(':')[0]) < 12),
      afternoon: all.filter(s => parseInt(s.split(':')[0]) >= 12 && parseInt(s.split(':')[0]) < 17),
      evening: all.filter(s => parseInt(s.split(':')[0]) >= 17)
    };
  });

  readonly currentPeriodSlots = computed(() => {
    const p = this.selectedPeriod();
    const categorized = this.categorizedSlots();
    return categorized[p];
  });

  constructor() {
    this.ownersStore.ensureSeed();
    this.vetsStore.ensureSeed();

    // For owners: auto-set and lock the ownerId
    if (this.auth.role === 'owner' && this.auth.linkedOwnerId) {
      this.form.controls.ownerId.setValue(this.auth.linkedOwnerId);
      this.form.controls.ownerId.disable();
    }

    // Owners can't change status (it's always Scheduled on create)
    if (this.auth.role === 'owner') {
      this.form.controls.status.disable();
      this.form.controls.diagnosis.disable();
    }

    effect(() => {
      const ownerIds = this.owners().map((o) => o.id);
      if (ownerIds.length >= 2) this.petsStore.ensureSeed(ownerIds);
      // For staff: pre-select first owner if not set
      if (this.auth.role !== 'owner') {
        const firstOwnerId = ownerIds[0] ?? '';
        if (!this.form.controls.ownerId.value && firstOwnerId) {
          this.form.controls.ownerId.setValue(firstOwnerId);
        }
      }
    });
    effect(() => {
      const list = this.petsForSelectedOwner();
      const currentPetId = this.form.controls.petId.value;
      if (list.length === 0) { this.form.controls.petId.setValue(''); return; }
      if (!currentPetId || !list.some((p) => p.id === currentPetId)) this.form.controls.petId.setValue(list[0]!.id);
    });
    effect(() => {
      const pet = this.pets()[0];
      if (!pet) return;
      const vet = this.vets()[0];
      this.apptStore.ensureSeed(pet.id, pet.ownerId, vet?.id);
    });
    effect(() => {
      const id = this.editingId();
      if (!id) return;
      const appt = this.apptStore.getById(id);
      if (!appt) return;
      const d = new Date(appt.startAt);
      this.form.patchValue({
        ownerId: appt.ownerId, petId: appt.petId, vetId: appt.vetId ?? '',
        date: appt.startAt.split('T')[0],
        timeSlot: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
        reason: appt.reason, reasonDetails: appt.reasonDetails ?? '',
        status: appt.status, diagnosis: appt.diagnosis ?? '', notes: appt.notes ?? '',
      });
    });
  }

  startCreate() {
    this.editingId.set(null);
    this.step.set(1);
    const defaultDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 10);
    if (this.auth.role === 'owner') {
      const ownerId = this.auth.linkedOwnerId ?? '';
      const firstPetId = this.pets().find((p) => p.ownerId === ownerId)?.id ?? '';
      this.form.reset({
        ownerId, petId: firstPetId, vetId: '',
        date: defaultDate, timeSlot: '', reason: 'General Checkup', reasonDetails: '', status: 'Pending',
        diagnosis: '', notes: '',
      });
    } else {
      const firstOwnerId = this.owners()[0]?.id ?? '';
      const firstPetId = this.pets().find((p) => p.ownerId === firstOwnerId)?.id ?? '';
      this.form.reset({
        ownerId: firstOwnerId, petId: firstPetId, vetId: '',
        date: defaultDate, timeSlot: '', reason: 'General Checkup', reasonDetails: '', status: 'Scheduled',
        diagnosis: '', notes: '',
      });
    }
    this.dialog.open(this.formDialogTemplate, { panelClass: 'minimal-dialog', width: '90vw', maxWidth: '600px' });
  }

  startEdit(id: string) { 
    this.editingId.set(id); 
    this.step.set(1);
    this.dialog.open(this.formDialogTemplate, { panelClass: 'minimal-dialog', width: '90vw', maxWidth: '600px' });
  }

  nextStep() {
    if (this.step() === 1) {
       this.form.controls.ownerId.markAsTouched();
       this.form.controls.petId.markAsTouched();
       this.form.controls.vetId.markAsTouched();
       this.form.controls.reason.markAsTouched();
       if (
         this.form.controls.petId.invalid || 
         this.form.controls.ownerId.invalid ||
         this.form.controls.vetId.invalid ||
         this.form.controls.reason.invalid
       ) return;
       this.step.set(2);
    } else if (this.step() === 2) {
       this.form.controls.date.markAsTouched();
       this.form.controls.timeSlot.markAsTouched();
       if (this.form.controls.date.invalid || this.form.controls.timeSlot.invalid) return;
       this.step.set(3);
    }
  }

  prevStep() {
    if (this.step() > 1) this.step.set(this.step() - 1 as any);
  }

  goToStep(s: 1 | 2 | 3) {
      if (s < this.step()) this.step.set(s);
  }

  closeForm() {
    this.dialog.closeAll();
    this.editingId.set(null);
  }

  canEditRow(appt: { ownerId: string }): boolean {
    if (this.auth.hasRole('admin', 'vet')) return true;
    // Owner can only edit their own
    return this.auth.role === 'owner' && appt.ownerId === this.auth.linkedOwnerId;
  }

  canCancelRow(appt: { ownerId: string; status: AppointmentStatus }): boolean {
    if (this.auth.hasRole('admin')) return true;
    // Owner can cancel their own if Scheduled or Pending
    return this.auth.role === 'owner' && appt.ownerId === this.auth.linkedOwnerId && 
           (appt.status === 'Scheduled' || appt.status === 'Pending');
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    const isoStartAt = new Date(`${raw.date}T${raw.timeSlot}:00`).toISOString();
    const durationMinutes = raw.reason === 'Dental' ? 60 : raw.reason === 'Illness / Injury' ? 45 : 30;

    const id = this.apptStore.upsert({
      id: this.editingId() ?? undefined, ownerId: raw.ownerId, petId: raw.petId,
      vetId: raw.vetId || undefined, startAt: isoStartAt, durationMinutes,
      reason: raw.reason, reasonDetails: raw.reasonDetails, status: raw.status, diagnosis: raw.diagnosis, notes: raw.notes,
    });
    this.editingId.set(id);
    this.closeForm(); // Hide form after saving
    this.toast.success('จองนัดหมายเรียบร้อย');
  }

  // --- Billing Logic ---
  openBilling(id: string) {
    const appt = this.apptStore.getById(id);
    if (!appt) return;
    this.billingId.set(id);
    this.billItems.set(appt.billItems?.map(b => ({...b})) || [{ id: newId('itm'), name: '', price: 0 }]);
    this.dialog.open(this.billingDialogTemplate, { panelClass: 'minimal-dialog', width: '90vw', maxWidth: '600px' });
  }

  addBillItem() {
    this.billItems.update(items => [...items, { id: newId('itm'), name: '', price: 0 }]);
  }

  removeBillItem(idx: number) {
    this.billItems.update(items => items.filter((_, i) => i !== idx));
  }
  
  updateBillItem(idx: number, field: 'name' | 'price', event: Event) {
     const value = (event.target as HTMLInputElement).value;
     this.billItems.update(items => {
        const newItems = [...items];
        if (field === 'price') newItems[idx].price = +value || 0;
        else newItems[idx].name = value;
        return newItems;
     });
  }

  startTreatment(apptId: string) {
     this.router.navigate(['/treatment', apptId]);
  }

  saveBilling() {
    const id = this.billingId();
    if (!id) return;
    const appt = this.apptStore.getById(id);
    if (!appt) return;
    
    const validItems = this.billItems().filter(i => i.name.trim() && i.price > 0);
    
    this.apptStore.upsert({
       ...appt,
       billItems: validItems,
       totalCost: validItems.reduce((sum, item) => sum + (+item.price || 0), 0),
       paymentStatus: appt.paymentStatus === 'Paid' ? 'Paid' : 'Pending',
       status: 'Completed' // Auto complete
    });
    this.dialog.closeAll();
    this.billingId.set(null);
    this.toast.success('ส่งใบแจ้งหนี้ให้ลูกค้าแล้ว — รอการชำระเงิน');
  }
  
  closeBilling() {
    this.dialog.closeAll();
    this.billingId.set(null);
  }
  // -------------------

  cancelAppointment(id: string) {
    const appt = this.apptStore.getById(id);
    if (!appt) return;
    this.apptStore.upsert({ ...appt, status: 'Cancelled' });
    this.toast.warning('ยกเลิกการจองแล้ว');
  }

  approveAppointment(id: string) {
    const appt = this.apptStore.getById(id);
    if (!appt) return;
    this.apptStore.upsert({ ...appt, status: 'Scheduled' });
    this.toast.success('อนุมัตินัดหมายเรียบร้อย');
    
    // Auto-navigate to treatment if the one approving is a Vet
    if (this.auth.role === 'vet') {
      this.router.navigate(['/treatment', id]);
    }
  }

  remove(id: string) {
    this.apptStore.remove(id);
    if (this.editingId() === id) this.startCreate();
    this.toast.success('ลบรายการแล้ว');
  }

  ownerName(ownerId: string) { return this.ownerNameById().get(ownerId) ?? 'ไม่ทราบ'; }
  petName(petId: string) { return this.petNameById().get(petId) ?? 'ไม่ทราบ'; }
  vetName(vetId: string) { return vetId ? (this.vetNameById().get(vetId) ?? '—') : 'ยังไม่ระบุ'; }
  
  getQueueNumber(apptId: string): number {
    const appt = this.apptStore.getById(apptId);
    if (!appt || !appt.vetId) return 0; // Requires a vet to have a queue
    const date = appt.startAt.split('T')[0];
    
    const sameDayAppts = this.appointments().filter(a => a.vetId === appt.vetId && a.startAt.startsWith(date));
    const sorted = [...sameDayAppts].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
    const index = sorted.findIndex(a => a.id === appt.id);
    
    return index >= 0 ? index + 1 : 0;
  }

  formatWhen(iso: string) { try { return new Date(iso).toLocaleString('th-TH'); } catch { return iso; } }
  statusClass(s: AppointmentStatus) {
    return { 'badge-scheduled': s === 'Scheduled', 'badge-checkedin': s === 'CheckedIn', 'badge-completed': s === 'Completed', 'badge-cancelled': s === 'Cancelled' };
  }
  statusThai(s: string) {
    const map: Record<string, string> = { All: 'ทั้งหมด', Pending: 'รออนุมัติ', Scheduled: 'รอพบแพทย์', CheckedIn: 'เช็คอินแล้ว', Completed: 'เสร็จสิ้น', Cancelled: 'ยกเลิก' };
    return map[s] ?? s;
  }
  reasonThai(r: string) {
    const map: Record<string, string> = {
      'Annual Vaccination': 'ฉีดวัคซีนประจำปี',
      'Illness / Injury': 'เจ็บป่วย / บาดเจ็บ',
      'General Checkup': 'ตรวจสุขภาพทั่วไป',
      'Follow-up': 'ตรวจติดตามอาการ',
      'Dental': 'ตรวจช่องปากและฟัน',
      'Surgery': 'ศัลยกรรม / ผ่าตัด',
      'Other': 'อื่นๆ'
    };
    return map[r] ?? r;
  }
}

function pad2(n: number) { return `${n}`.padStart(2, '0'); }
