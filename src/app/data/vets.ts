import { Injectable, computed } from '@angular/core';
import { newId } from '../models/ids';
import type { Vet, VetSpecialty } from '../models/vet';
import { createStoredSignal } from './storage';

@Injectable({ providedIn: 'root' })
export class Vets {
    private readonly store = createStoredSignal<Vet[]>('petClinic.vets.v1', []);

    readonly vets = computed(() => this.store.state());

    ensureSeed() {
        if (this.store.state().length > 0) return;
        const now = new Date().toISOString();
        this.store.persist([
            {
                id: newId('vet'),
                fullName: 'Dr. Araya Sirikul',
                specialty: 'General Practice',
                phone: '0812223333',
                email: 'araya@petclinic.com',
                available: true,
                createdAt: now,
            },
            {
                id: newId('vet'),
                fullName: 'Dr. Nattaporn Chai',
                specialty: 'Surgery',
                phone: '0856667777',
                email: 'nattaporn@petclinic.com',
                available: true,
                createdAt: now,
            },
            {
                id: newId('vet'),
                fullName: 'Dr. Pakorn Lertrat',
                specialty: 'Dermatology',
                phone: '0893334444',
                email: 'pakorn@petclinic.com',
                available: false,
                createdAt: now,
            },
        ]);
    }

    getById(id: string) {
        return this.store.state().find((v) => v.id === id);
    }

    upsert(input: Omit<Vet, 'id' | 'createdAt'> & Partial<Pick<Vet, 'id'>>) {
        const now = new Date().toISOString();
        const list = this.store.state();
        const id = input.id ?? newId('vet');
        const existingIdx = list.findIndex((v) => v.id === id);
        const next: Vet = {
            id,
            fullName: input.fullName.trim(),
            specialty: input.specialty as VetSpecialty,
            phone: input.phone?.trim() || undefined,
            email: input.email?.trim() || undefined,
            available: input.available,
            createdAt: existingIdx >= 0 ? list[existingIdx]!.createdAt : now,
        };
        const updated = existingIdx >= 0 ? list.map((v) => (v.id === id ? next : v)) : [next, ...list];
        this.store.persist(updated);
        return id;
    }

    remove(id: string) {
        this.store.persist(this.store.state().filter((v) => v.id !== id));
    }
}
