import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../services/toast.service';
import { Appointments } from '../../data/appointments';
import { Pets } from '../../data/pets';
import { Vets } from '../../data/vets';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-bills',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './bills.html',
  styleUrl: './bills.scss',
})
export class Bills {
  private readonly apptStore = inject(Appointments);
  private readonly petsStore = inject(Pets);
  private readonly vetsStore = inject(Vets);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly isOwner = computed(() => this.auth.role === 'owner');

  // get all appointments that have bills
  readonly allBills = computed(() => {
    let list = this.apptStore.appointments().filter(a => a.billItems && a.billItems.length > 0);
    
    // If owner, show only their bills
    if (this.isOwner()) {
      list = list.filter(a => a.ownerId === this.auth.linkedOwnerId);
    }
    
    // Sort by most recent startAt
    return list.sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt));
  });

  readonly pendingBills = computed(() => this.allBills().filter(b => b.paymentStatus === 'Pending'));
  readonly paidBills = computed(() => this.allBills().filter(b => b.paymentStatus === 'Paid'));

  readonly pets = computed(() => this.petsStore.pets());
  readonly vets = computed(() => this.vetsStore.vets());

  petName(id: string) { return this.pets().find(p => p.id === id)?.name ?? 'ไม่ทราบ'; }
  vetName(id?: string) { return id ? (this.vets().find(v => v.id === id)?.fullName ?? '—') : '—'; }

  formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return iso;
    }
  }

  payBill(id: string) {
    const appt = this.apptStore.getById(id);
    if (!appt) return;
    
    // Simulate payment process
    this.apptStore.upsert({
      ...appt,
      paymentStatus: 'Paid',
      paidAt: new Date().toISOString()
    });
    
    this.toast.success('ชำระเงินเรียบร้อยแล้ว');
    this.router.navigate(['/my-treatment-history']);
  }
}
