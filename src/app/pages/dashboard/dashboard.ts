import { MatTooltipModule } from '@angular/material/tooltip';
import { NgClass, CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { Appointments } from '../../data/appointments';
import { Owners } from '../../data/owners';
import { Pets } from '../../data/pets';
import { Vets } from '../../data/vets';
import { MedicalRecords } from '../../data/medical-records';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/product';
import { Products } from '../../data/products';
import { Banner } from '../../models/banner';
import { SAMPLE_BANNERS } from '../../data/banners';
import { SpeciesIconPipe } from '../../pipes/species-icon.pipe';


@Component({
  selector: 'app-dashboard',
  imports: [MatCardModule, MatIconModule, MatListModule, MatButtonModule, MatSnackBarModule, RouterLink, NgClass, MatTooltipModule, CurrencyPipe, SpeciesIconPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly ownersStore = inject(Owners);
  private readonly petsStore = inject(Pets);
  private readonly apptStore = inject(Appointments);
  private readonly vetsStore = inject(Vets);
  private readonly recordsStore = inject(MedicalRecords);
  private readonly productsStore = inject(Products);
  private readonly snack = inject(MatSnackBar);
  readonly auth = inject(AuthService);

  readonly recommendedProducts = signal<Product[]>([]);

  readonly banners = signal<Banner[]>(SAMPLE_BANNERS.slice(0, 5));
  readonly currentBannerIndex = signal(0);
  private bannerInterval: any;
  private productRotationInterval: any;


  ngOnInit() {

    // (slideInterval removed as it's no longer a carousel)

    this.bannerInterval = setInterval(() => {
      const len = this.banners().length || 1;
      const nextIndex = (this.currentBannerIndex() + 1) % len;
      if (nextIndex === 0) {
        this.refreshBanners();
      }
      this.currentBannerIndex.set(nextIndex);
    }, 5000);

    this.productRotationInterval = setInterval(() => {
      this.shuffleProducts();
    }, 8000);
  }


  private refreshBanners() {
    const shuffled = [...SAMPLE_BANNERS].sort(() => 0.5 - Math.random());
    this.banners.set(shuffled.slice(0, 5));
  }

  private shuffleProducts() {
    const all = this.productsStore.products();
    if (all.length > 0) {
      const shuffled = [...all].sort(() => 0.5 - Math.random());
      this.recommendedProducts.set(shuffled.slice(0, 5));
    }
  }




  ngOnDestroy() {
    // slideInterval cleanup removed
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
    }
    if (this.productRotationInterval) {
      clearInterval(this.productRotationInterval);
    }
  }


    // goToSlide removed

  goToBannerSlide(index: number) {
    this.currentBannerIndex.set(index);
    clearInterval(this.bannerInterval);
    this.bannerInterval = setInterval(() => {
      const len = this.banners().length || 1;
      const nextIndex = (this.currentBannerIndex() + 1) % len;
      if (nextIndex === 0) {
        this.refreshBanners();
      }
      this.currentBannerIndex.set(nextIndex);
    }, 5000);
  }



  readonly owners = computed(() => this.ownersStore.owners());
  readonly pets = computed(() => this.petsStore.pets());
  readonly vets = computed(() => this.vetsStore.vets());
  readonly records = computed(() => this.recordsStore.records());

  // All appointments (raw)
  private readonly allAppointments = computed(() => this.apptStore.appointments());

  // Scoped appointments by role
  readonly appointments = computed(() => {
    let list = this.allAppointments();
    
    // Admin/Vet see ALL clinic appointments for a complete daily overview
    if (this.auth.role === 'admin' || this.auth.role === 'vet') {
      return list;
    }

    // Owner: only see own appointments
    if (this.auth.role === 'owner') {
      const ownerId = this.auth.linkedOwnerId;
      if (ownerId) list = list.filter((a) => a.ownerId === ownerId);
      else list = [];
    }
    
    return list;
  });

  readonly today = computed(() => {
    const list = this.appointments();
    // Use local YYYY-MM-DD for robust "Today" filtering
    const now = new Date();
    const todayStr = now.toLocaleDateString('sv-SE'); // sv-SE gives YYYY-MM-DD format efficiently

    return list.filter((a) => {
       const apptDate = new Date(a.startAt);
       const apptDateStr = apptDate.toLocaleDateString('sv-SE');
       return apptDateStr === todayStr && a.status !== 'Cancelled';
    });
  });

  readonly upcoming = computed(() => {
    const now = new Date();
    const max = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
    return this.appointments()
      .filter((a) => {
        const t = Date.parse(a.startAt);
        return Number.isFinite(t) && t >= now.getTime() && t <= max.getTime() && a.status !== 'Cancelled';
      })
      .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
      .slice(0, 8);
  });

  // KANBAN View logic for Staff/Vets (Today's Command Center)
  readonly scheduledToday = computed(() => this.today().filter(a => a.status === 'Scheduled' || a.status === 'Pending').sort((a,b) => a.startAt.localeCompare(b.startAt)));
  readonly checkedInToday = computed(() => this.today().filter(a => a.status === 'CheckedIn').sort((a,b) => a.startAt.localeCompare(b.startAt)));
  readonly inSessionToday = computed(() => this.today().filter(a => a.status === 'InSession').sort((a,b) => a.startAt.localeCompare(b.startAt)));
  readonly completedToday = computed(() => this.today().filter(a => a.status === 'Completed').sort((a,b) => a.startAt.localeCompare(b.startAt)));

  // Health Reminders for Owners
  readonly healthReminders = computed(() => {
    if (this.auth.role !== 'owner') return [];
    return this.scopedPets().map(p => {
       return {
          petId: p.id,
          petName: p.name,
          message: `${p.name} is due for Annual Vaccination soon.`,
          icon: 'vaccines',
          color: 'blue'
       };
    });
  });

  readonly statusBreakdown = computed(() => {
    const counts = { Scheduled: 0, CheckedIn: 0, InSession: 0, Completed: 0, Cancelled: 0 };
    for (const a of this.appointments()) {
        if (counts[a.status as keyof typeof counts] !== undefined) {
             counts[a.status as keyof typeof counts]++;
        }
    }
    return counts;
  });

  readonly ownerNameById = computed(() => new Map(this.owners().map((o) => [o.id, o.fullName] as const)));
  readonly petNameById = computed(() => new Map(this.pets().map((p) => [p.id, p.name] as const)));
  readonly vetNameById = computed(() => new Map(this.vets().map((v) => [v.id, v.fullName] as const)));

  // Role-aware scoped counts for KPIs
  readonly scopedPets = computed(() => {
    if (this.auth.role === 'owner') {
      const ownerId = this.auth.linkedOwnerId;
      return ownerId ? this.pets().filter((p) => p.ownerId === ownerId) : [];
    }
    return this.pets();
  });

  constructor() {
    this.ownersStore.ensureSeed();
    this.vetsStore.ensureSeed();
    effect(() => {
      const ownerIds = this.owners().map((o) => o.id);
      if (ownerIds.length >= 2) this.petsStore.ensureSeed(ownerIds);
    });
    effect(() => {
      const pet = this.pets()[0];
      if (!pet) return;
      const vet = this.vets()[0];
      this.apptStore.ensureSeed(pet.id, pet.ownerId, vet?.id);
      this.recordsStore.ensureSeed(pet.id, pet.ownerId, vet?.id);
    });

    effect(() => {
      const allProducts = this.productsStore.products();
      if (allProducts.length > 0) {
        const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
        this.recommendedProducts.set(shuffled.slice(0, 5));
      }
    }, { allowSignalWrites: true });
  }

  ownerName(id: string) { return this.ownerNameById().get(id) ?? 'Unknown'; }
  petName(id: string) { return this.petNameById().get(id) ?? 'Unknown'; }
  vetName(id: string) { return id ? (this.vetNameById().get(id) ?? '') : ''; }
  when(iso: string) { try { return new Date(iso).toLocaleString(); } catch { return iso; } }
  getTime(iso: string) { try { return new Date(iso).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); } catch { return iso; } }
  statusBadge(s: string) {
    return { 'badge-scheduled': s === 'Scheduled', 'badge-checkedin': s === 'CheckedIn', 'badge-insession': s === 'InSession', 'badge-completed': s === 'Completed', 'badge-cancelled': s === 'Cancelled' };
  }

  statusThai(s: string) {
    const map: Record<string, string> = { Scheduled: 'รอนัดหมาย', CheckedIn: 'รอตรวจ (เช็คอิน)', InSession: 'กำลังตรวจ', Completed: 'เสร็จสิ้น', Cancelled: 'ยกเลิก' };
    return map[s] ?? s;
  }

  handleAction(action: string) {
    this.snack.open(`✓ ${action}สำเร็จ`, 'ตกลง', { duration: 1500 });
  }
}
