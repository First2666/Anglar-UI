import { Injectable, computed } from '@angular/core';
import { newId } from '../models/ids';
import type { Appointment, AppointmentStatus, AppointmentReason } from '../models/appointment';
import { createStoredSignal } from './storage';

@Injectable({
  providedIn: 'root',
})
export class Appointments {
  private readonly store = createStoredSignal<Appointment[]>('petClinic.appointments.v1', []);

  readonly appointments = computed(() => this.store.state());

  ensureSeed(petId: string, ownerId: string, vetId?: string) {
    if (this.store.state().length > 0) return;
    if (!petId || !ownerId) return;
    const now = new Date();
    const isoNow = now.toISOString();
    const day = (offset: number) => new Date(now.getTime() + 1000 * 60 * 60 * 24 * offset).toISOString();
    this.store.persist([
      {
        id: newId('apt'),
        petId,
        ownerId,
        vetId,
        startAt: day(1),
        durationMinutes: 15,
        reason: 'Annual Vaccination',
        status: 'Scheduled',
        diagnosis: undefined,
        notes: 'Bring vaccination certificate.',
        createdAt: isoNow,
      },
      {
        id: newId('apt'),
        petId,
        ownerId,
        vetId,
        startAt: day(2),
        durationMinutes: 45,
        reason: 'Illness / Injury',
        reasonDetails: 'Skin rash follow-up',
        status: 'Scheduled',
        diagnosis: undefined,
        notes: 'Check if rash improved after antihistamine.',
        createdAt: isoNow,
      },
      {
        id: newId('apt'),
        petId,
        ownerId,
        vetId,
        startAt: day(-2),
        durationMinutes: 30,
        reason: 'General Checkup',
        status: 'Completed',
        diagnosis: 'Healthy – mild dehydration',
        notes: 'Increase water intake.',
        billItems: [
          { id: newId('itm'), name: 'ค่าเข้าตรวจและบริการ', price: 300 },
          { id: newId('itm'), name: 'น้ำเกลือใต้ผิวหนัง', price: 250 },
          { id: newId('itm'), name: 'วิตามินบำรุง', price: 150 }
        ],
        totalCost: 700,
        paymentStatus: 'Pending',
        createdAt: isoNow,
      },
      {
        id: newId('apt'),
        petId,
        ownerId,
        vetId,
        startAt: day(-5),
        durationMinutes: 60,
        reason: 'Dental',
        reasonDetails: 'Routine dental scaling',
        status: 'Completed',
        diagnosis: 'Mild tartar build-up removed',
        notes: 'Next dental check in 6 months.',
        billItems: [
          { id: newId('itm'), name: 'ขูดหินปูนสุนัข', price: 1200 },
          { id: newId('itm'), name: 'ยาสลบ', price: 500 }
        ],
        totalCost: 1700,
        paymentStatus: 'Paid',
        paidAt: day(-5),
        createdAt: isoNow,
      },
      {
        id: newId('apt'),
        petId,
        ownerId,
        vetId,
        startAt: day(0),
        durationMinutes: 15,
        reason: 'Follow-up',
        reasonDetails: 'Post-op suture check',
        status: 'CheckedIn',
        diagnosis: undefined,
        notes: 'Sutures appear clean.',
        createdAt: isoNow,
      },
      {
        id: newId('apt'),
        petId,
        ownerId,
        vetId,
        startAt: day(5),
        durationMinutes: 15,
        reason: 'Other',
        reasonDetails: 'Deworming',
        status: 'Scheduled',
        diagnosis: undefined,
        notes: '',
        createdAt: isoNow,
      },
      {
        id: newId('apt'),
        petId,
        ownerId,
        vetId,
        startAt: day(-10),
        durationMinutes: 45,
        reason: 'Illness / Injury',
        reasonDetails: 'Emergency – vomiting',
        status: 'Completed',
        diagnosis: 'Gastritis',
        notes: 'Prescribed omeprazole.',
        createdAt: isoNow,
      },
      {
        id: newId('apt'),
        petId,
        ownerId,
        vetId,
        startAt: day(3),
        durationMinutes: 30,
        reason: 'Other',
        reasonDetails: 'Weight management consultation',
        status: 'Scheduled',
        diagnosis: undefined,
        notes: 'Diet plan to be drafted.',
        createdAt: isoNow,
      },
      {
        id: newId('apt'),
        petId,
        ownerId,
        vetId,
        startAt: day(-1),
        durationMinutes: 15,
        reason: 'Other',
        reasonDetails: 'Flea treatment',
        status: 'Cancelled',
        diagnosis: undefined,
        notes: 'Owner cancelled; rescheduled.',
        createdAt: isoNow,
      },
      {
        id: newId('apt'),
        petId,
        ownerId,
        vetId,
        startAt: day(7),
        durationMinutes: 15,
        reason: 'General Checkup',
        reasonDetails: 'Blood panel',
        status: 'Scheduled',
        diagnosis: undefined,
        notes: 'Fasting required before visit.',
        createdAt: isoNow,
      },
      {
        id: newId('apt'),
        petId,
        ownerId,
        vetId,
        startAt: day(4),
        durationMinutes: 15,
        reason: 'General Checkup',
        status: 'Pending',
        createdAt: isoNow,
      },
    ]);
  }

  getById(id: string) {
    return this.store.state().find((a) => a.id === id);
  }

  upsert(
    input: Omit<Appointment, 'id' | 'createdAt'> & Partial<Pick<Appointment, 'id' | 'createdAt'>>
  ) {
    const now = new Date().toISOString();
    const list = this.store.state();
    const id = input.id ?? newId('apt');
    const existingIdx = list.findIndex((a) => a.id === id);
    const next: Appointment = {
      id,
      petId: input.petId,
      ownerId: input.ownerId,
      vetId: input.vetId || undefined,
      startAt: input.startAt,
      durationMinutes: input.durationMinutes || 30,
      reason: input.reason as AppointmentReason,
      reasonDetails: input.reasonDetails?.trim() || undefined,
      status: input.status as AppointmentStatus,
      diagnosis: input.diagnosis?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      billItems: input.billItems,
      totalCost: input.totalCost,
      paymentStatus: input.paymentStatus,
      paidAt: input.paidAt,
      createdAt: existingIdx >= 0 ? list[existingIdx]!.createdAt : now,
    };
    const updated = existingIdx >= 0 ? list.map((a) => (a.id === id ? next : a)) : [next, ...list];
    this.store.persist(updated);
    return id;
  }

  remove(id: string) {
    this.store.persist(this.store.state().filter((a) => a.id !== id));
  }
}
