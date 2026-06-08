import { Injectable, computed } from '@angular/core';
import { newId } from '../models/ids';
import type { Owner } from '../models/owner';
import { createStoredSignal } from './storage';

@Injectable({
  providedIn: 'root',
})
export class Owners {
  private readonly store = createStoredSignal<Owner[]>('petClinic.owners.v1', []);

  readonly owners = computed(() => this.store.state());

  ensureSeed() {
    if (this.store.state().length > 0) return;
    const now = new Date().toISOString();
    this.store.persist([
      {
        id: newId('own'),
        fullName: 'Somchai Prasert',
        phone: '0812345678',
        email: 'somchai@example.com',
        address: '123 Sukhumvit Rd, Bangkok 10110',
        createdAt: now,
      },
      {
        id: newId('own'),
        fullName: 'Suda Wattanakul',
        phone: '0890001112',
        email: 'suda@example.com',
        address: '45 Nimmanhaemin Rd, Chiang Mai 50200',
        createdAt: now,
      },
      {
        id: newId('own'),
        fullName: 'Priya Thongsuk',
        phone: '0823456789',
        email: 'priya@example.com',
        address: '78 Ratchadaphisek Rd, Bangkok 10400',
        createdAt: now,
      },
      {
        id: newId('own'),
        fullName: 'Korn Buranasiri',
        phone: '0867891234',
        email: 'korn@example.com',
        address: '15 Pattaya Beach Rd, Chonburi 20150',
        createdAt: now,
      },
      {
        id: newId('own'),
        fullName: 'Malee Charoenwong',
        phone: '0845678901',
        email: 'malee@example.com',
        address: '32 Rawai Village, Phuket 83130',
        createdAt: now,
      },
    ]);
  }

  getById(id: string) {
    return this.store.state().find((o) => o.id === id);
  }

  upsert(input: Omit<Owner, 'id' | 'createdAt'> & Partial<Pick<Owner, 'id'>>) {
    const now = new Date().toISOString();
    const list = this.store.state();
    const id = input.id ?? newId('own');
    const existingIdx = list.findIndex((o) => o.id === id);
    const next: Owner = {
      id,
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() || undefined,
      email: input.email?.trim() || undefined,
      address: input.address?.trim() || undefined,
      createdAt: existingIdx >= 0 ? list[existingIdx]!.createdAt : now,
    };
    const updated = existingIdx >= 0 ? list.map((o) => (o.id === id ? next : o)) : [next, ...list];
    this.store.persist(updated);
    return id;
  }

  remove(id: string) {
    this.store.persist(this.store.state().filter((o) => o.id !== id));
  }
}
