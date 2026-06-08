import { Component, computed, inject, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Appointments } from '../../data/appointments';
import { Pets } from '../../data/pets';
import { Vets } from '../../data/vets';
import { Owners } from '../../data/owners';
import { AuthService } from '../../services/auth.service';
import { ConfirmDialogComponent } from '../../components/shared/confirm-dialog/confirm-dialog';
import type { AppointmentStatus } from '../../models/appointment';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [CommonModule, DecimalPipe, MatIconModule, MatButtonModule, MatTooltipModule, MatSnackBarModule, MatDialogModule],
  templateUrl: './my-appointments.html',
  styleUrl: './my-appointments.scss',
})
export class MyAppointments implements AfterViewInit {
  private readonly apptStore = inject(Appointments);
  private readonly petsStore = inject(Pets);
  private readonly vetsStore = inject(Vets);
  private readonly ownersStore = inject(Owners);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  @ViewChild('slider') sliderRef?: ElementRef<HTMLDivElement>;

  readonly isAdmin = computed(() => this.auth.role === 'admin');
  readonly isOwner = computed(() => this.auth.role === 'owner');
  readonly activeTab = signal<'pending' | 'upcoming' | 'history'>('upcoming');
  readonly activeSlide = signal(0); // track active dot

  readonly pets = computed(() => this.petsStore.pets());
  readonly vets = computed(() => this.vetsStore.vets());
  readonly owners = computed(() => this.ownersStore.owners());

  readonly petNameById = computed(() => new Map(this.pets().map(p => [p.id, p.name] as const)));
  readonly vetNameById = computed(() => new Map(this.vets().map(v => [v.id, v.fullName] as const)));

  readonly myAppointments = computed(() => {
    let list = this.apptStore.appointments();
    if (this.auth.role === 'owner') {
      const ownerId = this.auth.linkedOwnerId;
      list = ownerId ? list.filter(a => a.ownerId === ownerId) : [];
    }
    return list.sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt));
  });

  readonly pendingAppointments = computed(() =>
    this.myAppointments().filter(a => a.status === 'Pending')
  );

  readonly upcomingAppointments = computed(() =>
    this.myAppointments()
      .filter(a => a.status === 'Scheduled' || a.status === 'CheckedIn' || a.status === 'InSession')
      .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
  );

  readonly historyAppointments = computed(() =>
    this.myAppointments().filter(a => a.status === 'Completed' || a.status === 'Cancelled')
  );

  readonly activeList = computed(() => {
    const t = this.activeTab();
    if (t === 'pending')  return this.pendingAppointments();
    if (t === 'upcoming') return this.upcomingAppointments();
    return this.historyAppointments();
  });

  ngAfterViewInit() { this.setupDragScroll(); }

  private setupDragScroll() {
    const el = this.sliderRef?.nativeElement;
    if (!el) return;
    let isDown = false, startX = 0, scrollLeft = 0;
    el.addEventListener('mousedown', e => { isDown = true; el.classList.add('is-dragging'); startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; });
    el.addEventListener('mouseleave', () => { isDown = false; el.classList.remove('is-dragging'); });
    el.addEventListener('mouseup', () => { isDown = false; el.classList.remove('is-dragging'); });
    el.addEventListener('mousemove', e => { if (!isDown) return; e.preventDefault(); const x = e.pageX - el.offsetLeft; el.scrollLeft = scrollLeft - (x - startX) * 1.5; });
    el.addEventListener('scroll', () => {
      const cardWidth = el.querySelector('.appt-card')?.clientWidth ?? 340;
      this.activeSlide.set(Math.round(el.scrollLeft / (cardWidth + 16)));
    });
  }

  scrollToSlide(index: number) {
    const el = this.sliderRef?.nativeElement;
    if (!el) return;
    const cardWidth = el.querySelector('.appt-card')?.clientWidth ?? 340;
    el.scrollTo({ left: index * (cardWidth + 16), behavior: 'smooth' });
    this.activeSlide.set(index);
  }

  switchTab(tab: 'pending' | 'upcoming' | 'history') {
    this.activeTab.set(tab);
    this.activeSlide.set(0);
    setTimeout(() => this.sliderRef?.nativeElement?.scrollTo({ left: 0, behavior: 'instant' }), 0);
  }

  petName(id: string) { return this.petNameById().get(id) ?? 'ไม่ทราบ'; }
  vetName(id?: string) { return id ? (this.vetNameById().get(id) ?? '—') : 'ยังไม่ระบุหมอ'; }

  formatDate(iso: string) {
    try { return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' }); }
    catch { return iso; }
  }
  formatTime(iso: string) {
    try { return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  }

  statusThai(s: string) {
    const map: Record<string, string> = {
      Pending: 'รออนุมัติ', Scheduled: 'ยืนยันแล้ว',
      CheckedIn: 'เช็คอินแล้ว', InSession: 'กำลังรักษา',
      Completed: 'เสร็จสิ้น', Cancelled: 'ยกเลิก',
    };
    return map[s] ?? s;
  }

  cancelAppointment(id: string) {
    const appt = this.apptStore.getById(id);
    if (!appt) return;
    this.apptStore.upsert({ ...appt, status: 'Cancelled' });
    this.snack.open('ยกเลิกการนัดหมายแล้ว', 'ตกลง', { duration: 2500 });
  }

  deleteAppointment(id: string, event: Event) {
    event.stopPropagation();
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'ยืนยันการลบประวัติ',
        message: 'คุณแน่ใจหรือไม่ว่าต้องการลบประวัตินัดหมายนี้? การกระทำนี้ไม่สามารถย้อนกลับได้',
        confirmText: 'ลบประวัติ',
        confirmColor: 'warn',
        icon: 'delete_forever',
        iconColor: '#f44336'
      }
    });

    dialogRef.afterClosed().subscribe((confirm: boolean) => {
      if (confirm) {
        this.apptStore.remove(id);
        this.snack.open('ลบประวัตินัดหมายเรียบร้อยแล้ว', 'ตกลง', { duration: 2500 });
      }
    });
  }

  goToBills() { this.router.navigate(['/bills']); }
  goToNewAppointment() { this.router.navigate(['/appointments']); }
}
