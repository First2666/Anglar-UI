import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MedicalRecords as MedicalRecordsStore } from '../../data/medical-records';
import { Appointments } from '../../data/appointments';
import { Pets } from '../../data/pets';
import { Vets } from '../../data/vets';
import { Owners } from '../../data/owners';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-my-treatment-history',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './my-treatment-history.html',
  styleUrl: './my-treatment-history.scss',
})
export class MyTreatmentHistory {
  private readonly recordsStore = inject(MedicalRecordsStore);
  private readonly apptStore = inject(Appointments);
  private readonly petsStore = inject(Pets);
  private readonly vetsStore = inject(Vets);
  private readonly ownersStore = inject(Owners);
  readonly auth = inject(AuthService);

  readonly pets = computed(() => this.petsStore.pets());
  readonly vets = computed(() => this.vetsStore.vets());
  readonly owners = computed(() => this.ownersStore.owners());
  readonly records = computed(() => this.recordsStore.records());
  readonly appointments = computed(() => this.apptStore.appointments());

  readonly petNameById = computed(() => new Map(this.pets().map(p => [p.id, p.name] as const)));
  readonly vetNameById = computed(() => new Map(this.vets().map(v => [v.id, v.fullName] as const)));
  readonly ownerNameById = computed(() => new Map(this.owners().map(o => [o.id, o.fullName] as const)));
  readonly apptById = computed(() => new Map(this.appointments().map(a => [a.id, a] as const)));

  constructor() {
    this.ownersStore.ensureSeed();
    this.vetsStore.ensureSeed();
    effect(() => {
      const ownerIds = this.owners().map(o => o.id);
      if (ownerIds.length >= 2) this.petsStore.ensureSeed(ownerIds);
    });
    effect(() => {
      const pets = this.pets();
      const vets = this.vets();
      if (pets[0]?.ownerId) {
        this.recordsStore.ensureSeed(pets[0].id, pets[0].ownerId, vets[0]?.id);
      }
    });
  }

  /**
   * CORE RULE: For owners, only show medical records where:
   *   - The linked appointment's bill has been PAID, OR
   *   - There is no linked appointment (standalone record)
   *   - Also filter to only show Owner's own pets
   */
  readonly visibleRecords = computed(() => {
    let allRecords = this.records();

    if (this.auth.role === 'owner') {
      const ownerId = this.auth.linkedOwnerId;
      allRecords = allRecords.filter(r => {
        // Only own records
        if (r.ownerId !== ownerId) return false;

        // If linked to appointment, check payment
        if (r.appointmentId) {
          const appt = this.apptById().get(r.appointmentId);
          if (appt && appt.billItems && appt.billItems.length > 0) {
            // Has a bill -> must be Paid to show
            return appt.paymentStatus === 'Paid';
          }
        }
        // No appointment link or no bill -> show it (staff-created without billing)
        return true;
      });
    }

    return allRecords.sort((a, b) => b.date.localeCompare(a.date));
  });

  petName(id: string) { return this.petNameById().get(id) ?? 'ไม่ทราบ'; }
  vetName(id?: string) { return id ? (this.vetNameById().get(id) ?? '—') : '—'; }

  formatDate(date: string) {
    try {
      return new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return date; }
  }

  getApptBillingInfo(apptId?: string) {
    if (!apptId) return null;
    const appt = this.apptById().get(apptId);
    if (!appt || !appt.billItems?.length) return null;
    return { totalCost: appt.totalCost, paymentStatus: appt.paymentStatus };
  }
}
