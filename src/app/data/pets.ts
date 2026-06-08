import { Injectable, computed } from '@angular/core';
import { newId } from '../models/ids';
import type { Pet, PetSpecies, PetSex } from '../models/pet';
import { createStoredSignal } from './storage';

@Injectable({
  providedIn: 'root',
})
export class Pets {
  private readonly store = createStoredSignal<Pet[]>('petClinic.pets.v1', []);

  readonly pets = computed(() => this.store.state());

  ensureSeed(ownerIds: string[]) {
    if (this.store.state().length > 0) return;
    const now = new Date().toISOString();
    const [o1, o2, o3, o4, o5] = ownerIds;
    if (!o1 || !o2) return;
    const items: Pet[] = [
      {
        id: newId('pet'),
        name: 'Milo',
        species: 'Dog',
        sex: 'Male',
        neutered: true,
        microchip: '981020000123456',
        breed: 'Shiba Inu',
        birthDate: '2021-06-12',
        ownerId: o1,
        notes: 'Allergic to chicken.',
        createdAt: now,
      },
      {
        id: newId('pet'),
        name: 'Coco',
        species: 'Dog',
        sex: 'Female',
        neutered: true,
        breed: 'Golden Retriever',
        birthDate: '2020-03-04',
        ownerId: o1,
        notes: 'Loves swimming.',
        createdAt: now,
      },
      {
        id: newId('pet'),
        name: 'Luna',
        species: 'Cat',
        sex: 'Female',
        neutered: false,
        microchip: '981020000987654',
        breed: 'British Shorthair',
        birthDate: '2022-02-01',
        ownerId: o2,
        notes: 'Shy with strangers.',
        createdAt: now,
      },
      // {
      //   id: newId('pet'),
      //   name: 'Nemo',
      //   species: 'Bird',
      //   sex: 'Male',
      //   neutered: false,
      //   breed: 'Budgerigar',
      //   birthDate: '2023-07-19',
      //   ownerId: o2,
      //   notes: 'Speaks a few words.',
      //   createdAt: now,
      // },
      // {
      //   id: newId('pet'),
      //   name: 'Biscuit',
      //   species: 'Rabbit',
      //   sex: 'Male',
      //   neutered: true,
      //   breed: 'Holland Lop',
      //   birthDate: '2022-11-05',
      //   ownerId: o3 ?? o1,
      //   notes: 'Indoor rabbit, very calm.',
      //   createdAt: now,
      // },
      // {
      //   id: newId('pet'),
      //   name: 'Max',
      //   species: 'Dog',
      //   sex: 'Male',
      //   neutered: true,
      //   breed: 'Labrador',
      //   birthDate: '2019-08-22',
      //   ownerId: o3 ?? o1,
      //   notes: 'Arthritis – gentle exercise.',
      //   createdAt: now,
      // },
      // {
      //   id: newId('pet'),
      //   name: 'Mochi',
      //   species: 'Cat',
      //   sex: 'Male',
      //   neutered: true,
      //   breed: 'Persian',
      //   birthDate: '2023-01-14',
      //   ownerId: o4 ?? o2,
      //   notes: 'Requires daily grooming.',
      //   createdAt: now,
      // },
      // {
      //   id: newId('pet'),
      //   name: 'Kiki',
      //   species: 'Bird',
      //   sex: 'Female',
      //   neutered: false,
      //   breed: 'Cockatiel',
      //   birthDate: '2021-09-30',
      //   ownerId: o5 ?? o2,
      //   notes: 'Sings in the morning.',
      //   createdAt: now,
      // },
    ];
    this.store.persist(items);
  }

  getById(id: string) {
    return this.store.state().find((p) => p.id === id);
  }

  upsert(input: Omit<Pet, 'id' | 'createdAt'> & Partial<Pick<Pet, 'id'>>) {
    const now = new Date().toISOString();
    const list = this.store.state();
    const id = input.id ?? newId('pet');
    const existingIdx = list.findIndex((p) => p.id === id);
    const next: Pet = {
      id,
      name: input.name.trim(),
      species: input.species as PetSpecies,
      sex: (input.sex as PetSex) || 'Unknown',
      neutered: !!input.neutered,
      microchip: input.microchip?.trim() || undefined,
      breed: input.breed?.trim() || undefined,
      birthDate: input.birthDate || undefined,
      ownerId: input.ownerId,
      notes: input.notes?.trim() || undefined,
      photoUrls: input.photoUrls || [],
      createdAt: existingIdx >= 0 ? list[existingIdx]!.createdAt : now,
    };
    const updated = existingIdx >= 0 ? list.map((p) => (p.id === id ? next : p)) : [next, ...list];
    this.store.persist(updated);
    return id;
  }

  remove(id: string) {
    this.store.persist(this.store.state().filter((p) => p.id !== id));
  }
}
