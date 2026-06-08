import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
// MatSelectModule removed — using native <select> for minimal styling
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { BoardingStore } from '../../../data/boarding';
import { Pets } from '../../../data/pets';
import { AuthService } from '../../../services/auth.service';
import { RoomType } from '../../../models/boarding';

@Component({
  selector: 'app-boarding-booking-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    // MatSelectModule — native <select> used instead
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    CurrencyPipe
  ],
  templateUrl: './boarding-booking-dialog.html',
  styleUrl: './boarding-booking-dialog.scss'
})
export class BoardingBookingDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<BoardingBookingDialog>);
  public readonly data = inject(MAT_DIALOG_DATA, { optional: true });
  private readonly boardingStore = inject(BoardingStore);
  private readonly petsStore = inject(Pets);
  readonly auth = inject(AuthService);

  bookingForm!: FormGroup;
  readonly availablePets = signal<any[]>([]);
  readonly roomTypes: RoomType[] = ['Standard', 'Deluxe', 'VIP'];
  readonly totalAmount = signal(0);
  readonly currentImageIndex = signal(0);
  
  readonly roomDetailsMap: Record<string, any> = {
    'Standard': {
      review: 'ห้องพักขนาดกะทัดรัด สะอาด ปลอดภัย เหมาะสำหรับการเข้าพักระยะสั้นและสัตว์เลี้ยงขนาดเล็ก มีการดูแลพื้นฐานครบถ้วน',
      amenities: [
        { icon: 'home', text: 'กรงขนาดมาตรฐาน' },
        { icon: 'restaurant', text: 'มื้ออาหาร 2 มื้อ/วัน' },
        { icon: 'cleaning_services', text: 'ทำความสะอาดรายวัน' }
      ]
    },
    'Deluxe': {
      review: 'ห้องปรับอากาศเย็นสบาย พื้นที่กว้างช่วยให้สัตว์เลี้ยงไม่อึดอัด พร้อมบริการพาสัตว์เลี้ยงเดินเล่นผ่อนคลายในพื้นที่ส่วนกลาง',
      amenities: [
        { icon: 'space_dashboard', text: 'พื้นที่กว้างขวาง' },
        { icon: 'ac_unit', text: 'แอร์เย็นฉ่ำ 24 ชม.' },
        { icon: 'directions_walk', text: 'พาเดินเล่น 2 ครั้ง/วัน' }
      ]
    },
    'VIP': {
      review: 'บริการระดับพรีเมียมที่สุดเพื่อลูกรักของคุณ ห้องส่วนตัวขนาดกว้างขวางพร้อมกล้องวงจรปิด 24 ชั่วโมง ให้คุณอุ่นใจเหมือนอยู่ใกล้ๆ ตลอดเวลา',
      amenities: [
        { icon: 'meeting_room', text: 'ห้องพักระดับ Luxury' },
        { icon: 'videocam', text: 'กล้องวงจรปิดผ่านแอป' },
        { icon: 'spa', text: 'อาบน้ำและสปาฟรี' },
        { icon: 'star', text: 'ของเล่น/ของว่างพรีเมียม' }
      ]
    }
  };

  // Signal for currently selected room type string
  readonly selectedRoomTypeStr = signal<RoomType>('Standard');
  
  // Computed property to get the full room details
  readonly selectedRoomDetails = computed(() => {
    const type = this.selectedRoomTypeStr();
    const details = this.roomDetailsMap[type] || {};
    
    // If the selected type matches the specific room we clicked on, and it has images uploaded by admin
    let images: string[] = [];
    if (this.data?.room && this.data.room.type === type && this.data.room.imageUrls && this.data.room.imageUrls.length > 0) {
      images = this.data.room.imageUrls;
    }
    
    return { ...details, images };
  });

  ngOnInit() {
    this.initForm();
    this.loadPets();
  }

  private initForm() {
    this.bookingForm = this.fb.group({
      petId: ['', Validators.required],
      roomType: [{ value: this.data?.room?.type || 'Standard', disabled: !!this.data?.room }, Validators.required],
      checkInDate: [new Date(), Validators.required],
      checkOutDate: [new Date(Date.now() + 86400000), Validators.required],
      notes: ['']
    });

    this.bookingForm.valueChanges.subscribe(() => {
      this.calculateTotal();
      const currentType = this.bookingForm.getRawValue().roomType;
      if (this.selectedRoomTypeStr() !== currentType) {
        this.selectedRoomTypeStr.set(currentType);
        this.currentImageIndex.set(0); // Reset carousel on type change
      }
    });
    this.calculateTotal();
    this.selectedRoomTypeStr.set(this.bookingForm.getRawValue().roomType);
  }

  // --- Carousel Methods ---
  nextImage() {
    const images = this.selectedRoomDetails().images;
    const current = this.currentImageIndex();
    this.currentImageIndex.set((current + 1) % images.length);
  }

  prevImage() {
    const images = this.selectedRoomDetails().images;
    const current = this.currentImageIndex();
    this.currentImageIndex.set((current - 1 + images.length) % images.length);
  }

  private loadPets() {
    const allPets = this.petsStore.pets();
    
    // 1. Identify pets with active boarding stays (Confirmed or CheckedIn)
    const activePetIds = this.boardingStore.stays()
      .filter(s => s.status === 'Confirmed' || s.status === 'CheckedIn')
      .map(s => s.petId);

    // 2. Filter base list by ownership if applicable
    let baseList = allPets;
    if (this.auth.role === 'owner') {
      baseList = allPets.filter(p => p.ownerId === this.auth.linkedOwnerId);
    }

    // 3. Exclude pets that are already in the "hotel" or have a current booking
    const available = baseList.filter(p => !activePetIds.includes(p.id));
    this.availablePets.set(available);
  }

  calculateTotal() {
    const { checkInDate, checkOutDate } = this.bookingForm.value;
    const roomType = this.bookingForm.getRawValue().roomType;
    if (!checkInDate || !checkOutDate) return;

    const diff = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
    const nights = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    
    // If a specific room was passed, use its exact price, otherwise check the store based on type
    const rate = this.data?.room?.pricePerNight 
                 ?? this.boardingStore.rooms().find(r => r.type === roomType)?.pricePerNight 
                 ?? 500;
                 
    this.totalAmount.set(nights * rate);
  }

  onSubmit() {
    if (this.bookingForm.invalid) return;

    const val = this.bookingForm.getRawValue();
    const pet = this.availablePets().find(p => p.id === val.petId);
    const room = this.boardingStore.rooms().find(r => r.type === val.roomType && r.isAvailable) 
                 ?? this.boardingStore.rooms().find(r => r.type === val.roomType);

    this.boardingStore.addStay({
      petId: val.petId,
      ownerId: pet?.ownerId ?? '',
      roomType: val.roomType,
      roomNumber: this.data?.room?.roomNumber ?? room?.roomNumber ?? 'TBD',
      checkInDate: val.checkInDate.toISOString().slice(0, 10),
      checkOutDate: val.checkOutDate.toISOString().slice(0, 10),
      status: 'Confirmed',
      notes: val.notes,
      dailyRate: this.data?.room?.pricePerNight ?? room?.pricePerNight ?? 500,
      totalAmount: this.totalAmount()
    });

    this.dialogRef.close(true);
  }

  onCancel() {
    this.dialogRef.close();
  }
}
