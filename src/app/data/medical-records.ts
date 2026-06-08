import { Injectable, computed } from '@angular/core';
import { newId } from '../models/ids';
import type { MedicalRecord } from '../models/medical-record';
import { createStoredSignal } from './storage';

@Injectable({ providedIn: 'root' })
export class MedicalRecords {
    private readonly store = createStoredSignal<MedicalRecord[]>('petClinic.medicalRecords.v1', []);

    readonly records = computed(() => this.store.state());

    ensureSeed(petId: string, ownerId: string, vetId?: string) {
        if (this.store.state().length > 0) return;
        if (!petId || !ownerId) return;
        const now = new Date().toISOString();
        this.store.persist([
            {
                id: newId('rec'),
                petId,
                ownerId,
                vetId,
                date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10),
                subjective: "Owner reports pet is eating and drinking normally. Here for annual checkup.",
                objective: "Bright, alert, responsive. Coat is healthy. Heart and lungs auscultate normally. No palpable abdominal organomegaly.",
                assessment: "Healthy adult pet.",
                plan: "Administered Rabies and DHPP vaccines. Heartworm preventative dispensed.",
                weight: 12.5,
                temperature: 38.4,
                heartRate: 110,
                respiratoryRate: 24,
                createdAt: now,
            },
            {
                id: newId('rec'),
                petId,
                ownerId,
                vetId,
                date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString().slice(0, 10),
                subjective: "Owner noticed excessive scratching and redness on the belly for the past 3 days.",
                objective: "Erythema and mild excoriations on ventral abdomen. No fleas or flea dirt seen. Skin scraping negative for mites.",
                assessment: "Allergic dermatitis, likely environmental.",
                plan: "Prescribed antihistamine and anti-itch shampoo. Recheck in 2 weeks if not resolved.",
                weight: 12.2,
                temperature: 38.6,
                heartRate: 120,
                respiratoryRate: 28,
                createdAt: now,
            },
        ]);
    }

    getById(id: string) {
        return this.store.state().find((r) => r.id === id);
    }

    getByPetId(petId: string) {
        return this.store.state().filter((r) => r.petId === petId);
    }

    upsert(
        input: Omit<MedicalRecord, 'id' | 'createdAt'> & Partial<Pick<MedicalRecord, 'id'>>
    ) {
        const now = new Date().toISOString();
        const list = this.store.state();
        const id = input.id ?? newId('rec');
        const existingIdx = list.findIndex((r) => r.id === id);
        const next: MedicalRecord = {
            id,
            petId: input.petId,
            ownerId: input.ownerId,
            appointmentId: input.appointmentId || undefined,
            vetId: input.vetId || undefined,
            date: input.date,
            subjective: input.subjective.trim(),
            objective: input.objective.trim(),
            assessment: input.assessment.trim(),
            plan: input.plan.trim(),
            weight: input.weight || undefined,
            temperature: input.temperature || undefined,
            heartRate: input.heartRate || undefined,
            respiratoryRate: input.respiratoryRate || undefined,
            createdAt: existingIdx >= 0 ? list[existingIdx]!.createdAt : now,
        };
        const updated = existingIdx >= 0 ? list.map((r) => (r.id === id ? next : r)) : [next, ...list];
        this.store.persist(updated);
        return id;
    }

    remove(id: string) {
        this.store.persist(this.store.state().filter((r) => r.id !== id));
    }
}
