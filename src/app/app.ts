import { Component, signal, effect, PLATFORM_ID, inject, computed } from '@angular/core';
import { isPlatformBrowser, DecimalPipe } from '@angular/common';
import { trigger, transition, style, query, animate, group } from '@angular/animations';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from './services/auth.service';
import { Vets } from './data/vets';
import { Appointments } from './data/appointments';
import { Pets } from './data/pets';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ToastService } from './services/toast.service';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { Router } from '@angular/router';
import { TemplateRef, ViewChild } from '@angular/core';
import type { UserRole } from './models/user';
import type { Appointment } from './models/appointment';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    DecimalPipe,
    ToastContainerComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  animations: [
    trigger('routeAnimations', [
      transition('* <=> *', [
        style({ position: 'relative' }),
        query(':enter, :leave', [
          style({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            opacity: 0,
            transform: 'translateY(10px)'
          })
        ], { optional: true }),
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(10px)' })
        ], { optional: true }),
        group([
          query(':leave', [
            animate('0.3s ease-out', style({ opacity: 0, transform: 'translateY(-10px)' }))
          ], { optional: true }),
          query(':enter', [
            animate('0.5s 0.2s cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ], { optional: true })
        ])
      ])
    ])
  ]
})
export class App {
  private readonly platformId = inject(PLATFORM_ID);
  readonly auth = inject(AuthService);
  readonly darkMode = signal(false);
  readonly sidebarCollapsed = signal(false);
  readonly showLogoutConfirm = signal(false);
  
  private readonly apptStore = inject(Appointments);
  private readonly petsStore = inject(Pets);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  @ViewChild('billDialog') billDialogTemplate!: TemplateRef<any>;
  private billDialogRef: MatDialogRef<any> | null = null;

  // Track the ID of the bill currently shown in the modal to avoid repeated popups
  private lastNotifiedBillId: string | null = null;

  readonly pendingBill = computed(() => {
    if (this.auth.role !== 'owner') return null;
    const ownerId = this.auth.linkedOwnerId;
    if (!ownerId) return null;
    
    // Find most recent pending bill for this owner
    const bills = this.apptStore.appointments()
      .filter(a => a.ownerId === ownerId && a.paymentStatus === 'Pending' && a.billItems && a.billItems.length > 0)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
    
    return bills[0] ?? null;
  });

  readonly pets = computed(() => this.petsStore.pets());
  petName(id: string) { return this.pets().find(p => p.id === id)?.name ?? '—'; }

  readonly vets = computed(() => this.vetsStore.vets());
  vetName(id: string) { return this.vets().find(v => v.id === id)?.fullName ?? '—'; }

  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());
  readonly userFullName = computed(() => this.auth.currentUser()?.fullName ?? '');
  readonly userRole = computed(() => this.auth.currentUser()?.role ?? null);
  readonly currentRole = computed(() => this.roleThai(this.auth.currentUser()?.role ?? null));
  readonly useNavbarLayout = computed(() => {
    const role = this.userRole();
    return role === 'owner' || role === 'vet';
  });

  private readonly vetsStore = inject(Vets);
  readonly isVetAvailable = computed(() => {
    if (this.userRole() !== 'vet') return false;
    const vetId = this.auth.linkedVetId;
    if (!vetId) return false;
    const vet = this.vetsStore.getById(vetId);
    return vet?.available ?? false;
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('petClinic.darkMode');
      this.darkMode.set(stored !== 'false'); // Default to true unless explicitly unset
    } else {
      this.darkMode.set(true);
    }
    effect(() => {
      const dark = this.darkMode();
      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        localStorage.setItem('petClinic.darkMode', String(dark));
      }
    });

    // EFFECT: Monitor pending bills for owner and open notification modal
    effect(() => {
      const bill = this.pendingBill();
      
      // Auto-close if no longer pending (e.g. paid elsewhere)
      if (!bill && this.billDialogRef) {
        this.billDialogRef.close();
        this.billDialogRef = null;
      }

      if (bill && bill.id !== this.lastNotifiedBillId && !this.billDialogRef) {
        this.lastNotifiedBillId = bill.id;
        // Delay slightly for UI stability
        setTimeout(() => {
          if (!this.pendingBill()) return; // Re-check before opening
          this.billDialogRef = this.dialog.open(this.billDialogTemplate, {
            panelClass: 'minimal-dialog',
            width: '480px',
            maxWidth: '96vw',
            disableClose: true,
          });
        }, 800);
      }
    });
  }

  toggleDark() {
    this.darkMode.set(!this.darkMode());
  }

  toggleSidebar() {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  hasRole(...roles: UserRole[]): boolean {
    return this.auth.hasRole(...roles);
  }

  roleThai(role: string | null): string {
    if (!role) return '';
    const map: Record<string, string> = {
      admin: 'ผู้ดูแลระบบ',
      vet: 'สัตวแพทย์',
      receptionist: 'พนักงานต้อนรับ',
      owner: 'เจ้าของสัตว์',
    };
    return map[role] ?? role;
  }

  toggleVetAvailability() {
    if (this.userRole() !== 'vet') return;
    const vetId = this.auth.linkedVetId;
    if (!vetId) return;
    const vet = this.vetsStore.getById(vetId);
    if (!vet) return;
    this.vetsStore.upsert({ ...vet, available: !vet.available });
  }

  logout() {
    this.showLogoutConfirm.set(true);
  }

  cancelLogout() {
    this.showLogoutConfirm.set(false);
  }

  confirmLogout() {
    this.showLogoutConfirm.set(false);
    this.auth.logout();
  }

  // ────── Billing Notification Actions ──────

  payPendingBill() {
    const bill = this.pendingBill();
    if (!bill) return;

    this.apptStore.upsert({
      ...bill,
      paymentStatus: 'Paid',
      paidAt: new Date().toISOString(),
    });

    this.billDialogRef?.close();
    this.billDialogRef = null;
    this.toast.success('ชำระเงินเรียบร้อยแล้ว');
    this.router.navigate(['/my-treatment-history']);
  }

  deferPendingBill() {
    this.billDialogRef?.close();
    this.billDialogRef = null;
    this.toast.info('กรุณาชำระเงินที่เมนู "ค่าใช้จ่าย"');
  }

  getRouteAnimationData(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['title'];
  }
}
