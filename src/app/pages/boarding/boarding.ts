import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BoardingStay, BoardingRoom } from '../../models/boarding';
import { BoardingStore } from '../../data/boarding';
import { Pets } from '../../data/pets';
import { Owners } from '../../data/owners';
import { SpeciesIconPipe } from '../../pipes/species-icon.pipe';
import { AuthService } from '../../services/auth.service';
import { BoardingBookingDialog } from './boarding-booking-dialog/boarding-booking-dialog';
import { ConfirmDialogComponent } from '../../components/shared/confirm-dialog/confirm-dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastService } from '../../services/toast.service';
import { TemplateRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-boarding',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatButtonModule, 
    MatTooltipModule,
    MatDialogModule,
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSelectModule,
    SpeciesIconPipe
  ],
  templateUrl: './boarding.html',
  styleUrl: './boarding.scss'
})
export class Boarding {
  private readonly boardingStore = inject(BoardingStore);
  private readonly petsStore = inject(Pets);
  private readonly ownersStore = inject(Owners);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  @ViewChild('addRoomDialogRef') addRoomDialogTemplate!: TemplateRef<any>;

  readonly addRoomForm = this.fb.nonNullable.group({
    roomNumber: ['', [Validators.required]],
    type: ['Standard' as 'Standard' | 'Deluxe' | 'VIP', [Validators.required]],
    pricePerNight: [500, [Validators.required, Validators.min(1)]],
  });
  readonly newRoomImages = signal<string[]>([]);
  readonly adminImageIndex = signal(0);
  readonly isEditingRoom = signal<string | null>(null);

  readonly stays = computed(() => {
    const list = this.boardingStore.stays();
    if (this.auth.role === 'owner') {
      return list.filter(s => s.ownerId === this.auth.linkedOwnerId);
    }
    return list;
  });

  readonly rooms = computed(() => {
    const allRooms = this.boardingStore.rooms();
    const filter = this.roomFilter();
    if (filter === 'available') return allRooms.filter(r => r.isAvailable);
    if (filter === 'occupied') return allRooms.filter(r => !r.isAvailable);
    return allRooms;
  });

  readonly roomFilter = signal<'all' | 'available' | 'occupied'>('all');
  readonly pets = computed(() => this.petsStore.pets());

  setFilter(filter: 'all' | 'available' | 'occupied') {
    if (this.roomFilter() === filter) {
      this.roomFilter.set('all');
    } else {
      this.roomFilter.set(filter);
    }
  }

  readonly occupancy = computed(() => {
    const total = this.rooms().length;
    const occupied = this.stays().filter(s => s.status === 'CheckedIn').length;
    return {
      percent: Math.round((occupied / total) * 100),
      occupied,
      total
    };
  });
  getPetSpecies(id: string) {
    return this.pets().find(p => p.id === id)?.species ?? 'Other';
  }

  getPetName(id: string) {
    return this.pets().find(p => p.id === id)?.name ?? '—';
  }

  getRoomTypeThai(type: string): string {
    const map: Record<string, string> = { Standard: 'มาตรฐาน', Deluxe: 'ดีลักซ์', VIP: 'วีไอพี' };
    return map[type] ?? type;
  }

  getStatusClass(status: string) {
    return {
      'status-confirmed': status === 'Confirmed',
      'status-checked-in': status === 'CheckedIn',
      'status-checked-out': status === 'CheckedOut',
      'status-cancelled': status === 'Cancelled'
    };
  }

  openBookingDialog(data?: any) {
    const dialogRef = this.dialog.open(BoardingBookingDialog, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'p-0-dialog',
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Handled inside dialog or store
      }
    });
  }

  checkIn(id: string) {
    this.boardingStore.updateStatus(id, 'CheckedIn');
  }

  checkOut(id: string) {
    this.boardingStore.updateStatus(id, 'CheckedOut');
  }

  cancelBooking(id: string) {
    this.boardingStore.updateStatus(id, 'Cancelled');
  }

  removeStay(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'ยืนยันการลบ',
        message: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?',
        confirmText: 'ลบรายการ',
        icon: 'delete_outline',
        iconColor: '#f44336'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.boardingStore.removeStay(id);
        this.handleAction('ลบรายการ');
      }
    });
  }

  bookRoom(room: BoardingRoom) {
    if (!room.isAvailable) return;
    this.openBookingDialog({ room });
  }

  openRoomForm(room?: BoardingRoom) {
    if (room) {
      this.isEditingRoom.set(room.roomNumber);
      this.addRoomForm.reset({ 
        roomNumber: room.roomNumber, 
        type: room.type, 
        pricePerNight: room.pricePerNight 
      });
      this.addRoomForm.controls.roomNumber.disable();
      this.newRoomImages.set(room.imageUrls ? [...room.imageUrls] : []);
    } else {
      this.isEditingRoom.set(null);
      this.addRoomForm.reset({ roomNumber: '', type: 'Standard', pricePerNight: 500 });
      this.addRoomForm.controls.roomNumber.enable();
      this.newRoomImages.set([]);
    }
    this.adminImageIndex.set(0);
    this.dialog.open(this.addRoomDialogTemplate, { width: '420px', maxWidth: '95vw', panelClass: 'p-0-dialog' });
  }

  deleteRoom(roomNumber: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'ลบห้องพัก',
        message: `คุณแน่ใจหรือไม่ว่าต้องการลบห้องพัก ${roomNumber}?`,
        confirmText: 'ลบห้องพัก',
        icon: 'domain_disabled',
        iconColor: '#f44336'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        try {
          this.boardingStore.deleteRoom(roomNumber);
          this.toast.success(`ลบห้องพัก ${roomNumber} สำเร็จ`);
        } catch (e: any) {
          this.toast.error(e.message);
        }
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const currentImages = this.newRoomImages();
      const newImages: string[] = [...currentImages];
      
      Array.from(input.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          newImages.push(e.target?.result as string);
          this.newRoomImages.set([...newImages]);
        };
        reader.readAsDataURL(file);
      });
      input.value = ''; // Reset input to allow selecting same files again
    }
  }

  removeAdminImage(index: number) {
    const images = this.newRoomImages();
    const updated = [...images];
    updated.splice(index, 1);
    this.newRoomImages.set(updated);
    
    // adjust index
    const currentIdx = this.adminImageIndex();
    if (currentIdx >= updated.length && updated.length > 0) {
      this.adminImageIndex.set(updated.length - 1);
    } else if (updated.length === 0) {
      this.adminImageIndex.set(0);
    }
  }

  nextAdminImg() {
    const arr = this.newRoomImages();
    if(arr.length === 0) return;
    const cur = this.adminImageIndex();
    this.adminImageIndex.set((cur + 1) % arr.length);
  }

  prevAdminImg() {
    const arr = this.newRoomImages();
    if(arr.length === 0) return;
    const cur = this.adminImageIndex();
    this.adminImageIndex.set((cur - 1 + arr.length) % arr.length);
  }

  saveRoom() {
    if (this.addRoomForm.invalid) {
      this.addRoomForm.markAllAsTouched();
      return;
    }
    const raw = this.addRoomForm.getRawValue();
    try {
      if (this.isEditingRoom()) {
        this.boardingStore.updateRoom(raw.roomNumber, {
          type: raw.type,
          pricePerNight: Number(raw.pricePerNight),
          imageUrls: this.newRoomImages().length ? this.newRoomImages() : undefined
        });
        this.handleAction('แก้ไขข้อมูลห้องพัก');
      } else {
        this.boardingStore.addRoom({
          roomNumber: raw.roomNumber,
          type: raw.type,
          isAvailable: true,
          pricePerNight: Number(raw.pricePerNight),
          imageUrls: this.newRoomImages().length ? this.newRoomImages() : undefined
        });
        this.handleAction('เพิ่มห้องพัก');
      }
      this.dialog.closeAll();
    } catch (e: any) {
      this.toast.error(e.message);
    }
  }

  handleAction(action: string) {
    this.toast.success(`${action}สำเร็จ`);
  }

  cancelAddRoom() {
    this.dialog.closeAll();
  }

  getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }

  isOverdue(stay: BoardingStay): boolean {
    return stay.status === 'CheckedIn' && stay.checkOutDate < this.getToday();
  }

  isDueToday(stay: BoardingStay): boolean {
    return stay.status === 'CheckedIn' && stay.checkOutDate === this.getToday();
  }
}
