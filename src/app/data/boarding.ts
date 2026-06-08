import { Injectable, signal, computed } from '@angular/core';
import { BoardingStay, BoardingRoom } from '../models/boarding';
import { createStoredSignal } from './storage';

@Injectable({
  providedIn: 'root'
})
export class BoardingStore {
  private readonly staysStore = createStoredSignal<BoardingStay[]>('petClinic.boarding.stays.v2', []);
  private readonly roomsStore = createStoredSignal<BoardingRoom[]>('petClinic.boarding.rooms.v2', [
    { roomNumber: '101', type: 'Standard', isAvailable: true, pricePerNight: 500 },
    { roomNumber: '102', type: 'Standard', isAvailable: true, pricePerNight: 500 },
    { roomNumber: '103', type: 'Standard', isAvailable: true, pricePerNight: 500 },
    { roomNumber: '104', type: 'Standard', isAvailable: true, pricePerNight: 500 },
    { roomNumber: '105', type: 'Standard', isAvailable: true, pricePerNight: 500 },
    { roomNumber: '201', type: 'Deluxe', isAvailable: true, pricePerNight: 1200 },
    { roomNumber: '202', type: 'Deluxe', isAvailable: true, pricePerNight: 1200 },
    { roomNumber: '203', type: 'Deluxe', isAvailable: true, pricePerNight: 1200 },
    { roomNumber: '301', type: 'VIP', isAvailable: true, pricePerNight: 2500 },
    { roomNumber: '302', type: 'VIP', isAvailable: true, pricePerNight: 2500 }
  ]);

  readonly stays = computed(() => this.staysStore.state());
  readonly rooms = computed(() => this.roomsStore.state());

  constructor() {
    this.ensureSeed();
    this.autoCheckOutExpiredStays();
  }

  ensureSeed() {
    if (this.staysStore.state().length > 0) return;
    
    // Some sample data
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 604800000).toISOString().slice(0, 10);

    const initialStays: BoardingStay[] = [
      {
        id: 's1',
        petId: 'pet-dog-1', // Assuming this exists or will be seeded
        ownerId: 'owner-1',
        roomType: 'Standard',
        roomNumber: '101',
        checkInDate: today,
        checkOutDate: tomorrow,
        status: 'CheckedIn',
        dailyRate: 500,
        totalAmount: 500,
        notes: 'กินยาก ต้องผสมอาหารเปียก'
      },
      {
        id: 's2',
        petId: 'pet-cat-2',
        ownerId: 'owner-2',
        roomType: 'Deluxe',
        roomNumber: '201',
        checkInDate: tomorrow,
        checkOutDate: nextWeek,
        status: 'Confirmed',
        dailyRate: 1200,
        totalAmount: 8400,
        notes: 'แพ้ขนมแมวเลียบางยี่ห้อ'
      }
    ];

    this.staysStore.persist(initialStays);
    this.refreshRoomAvailability(initialStays);
  }

  private autoCheckOutExpiredStays() {
    const today = new Date().toISOString().slice(0, 10);
    const stays = this.staysStore.state();
    let changed = false;

    const updated = stays.map(s => {
      if (s.status === 'CheckedIn' && s.checkOutDate < today) {
        changed = true;
        return { ...s, status: 'CheckedOut' as const, notes: (s.notes || '') + '\n[Auto-CheckedOut]' };
      }
      return s;
    });

    if (changed) {
      this.staysStore.persist(updated);
      this.refreshRoomAvailability(updated);
    }
  }

  private refreshRoomAvailability(stays: BoardingStay[]) {
    const activeRoomNumbers = new Set(
      stays.filter(s => s.status === 'CheckedIn' || s.status === 'Confirmed').map(s => s.roomNumber)
    );

    const updatedRooms = this.roomsStore.state().map(r => ({
      ...r,
      isAvailable: !activeRoomNumbers.has(r.roomNumber)
    }));

    this.roomsStore.persist(updatedRooms);
  }

  addStay(stay: Omit<BoardingStay, 'id'>) {
    const newStay: BoardingStay = { ...stay, id: `s-${Date.now()}` };
    this.staysStore.persist([...this.staysStore.state(), newStay]);
    return newStay;
  }

  updateStatus(id: string, status: BoardingStay['status']) {
    const updated = this.staysStore.state().map(s => s.id === id ? { ...s, status } : s);
    this.staysStore.persist(updated);

    // If checked in, mark room as occupied
    if (status === 'CheckedIn' || status === 'Confirmed') {
      const stay = updated.find(s => s.id === id);
      if (stay) {
        this.updateRoomAvailability(stay.roomNumber, false);
      }
    } else if (status === 'CheckedOut' || status === 'Cancelled') {
      const stay = updated.find(s => s.id === id);
      if (stay) {
        this.updateRoomAvailability(stay.roomNumber, true);
      }
    }
  }

  private updateRoomAvailability(roomNumber: string, isAvailable: boolean) {
    const updatedRooms = this.roomsStore.state().map(r => 
      r.roomNumber === roomNumber ? { ...r, isAvailable } : r
    );
    this.roomsStore.persist(updatedRooms);
  }

  removeStay(id: string) {
    const updated = this.staysStore.state().filter(s => s.id !== id);
    this.staysStore.persist(updated);
    this.refreshRoomAvailability(updated);
  }

  addRoom(room: BoardingRoom) {
    const current = this.roomsStore.state();
    if (current.some(r => r.roomNumber === room.roomNumber)) {
      throw new Error(`Room number ${room.roomNumber} already exists`);
    }
    this.roomsStore.persist([...current, room]);
  }

  updateRoom(roomNumber: string, data: Partial<BoardingRoom>) {
    const updated = this.roomsStore.state().map(r => 
      r.roomNumber === roomNumber ? { ...r, ...data } : r
    );
    this.roomsStore.persist(updated);
  }

  deleteRoom(roomNumber: string) {
    // Check if room is occupied
    const activeStays = this.staysStore.state().filter(s => 
      s.roomNumber === roomNumber && (s.status === 'CheckedIn' || s.status === 'Confirmed')
    );
    if (activeStays.length > 0) {
      throw new Error(`Cannot delete room ${roomNumber} because it has active bookings.`);
    }

    const updatedRooms = this.roomsStore.state().filter(r => r.roomNumber !== roomNumber);
    this.roomsStore.persist(updatedRooms);
  }
}

