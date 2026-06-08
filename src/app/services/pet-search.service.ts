import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, switchMap, startWith } from 'rxjs/operators';
import { Pets as PetsStore } from '../data/pets';
import type { Pet } from '../models/pet';

/**
 * Section 16 – Observables & RxJS
 * Section 17 – RxJS Operators
 *
 * PetSearchService ใช้ BehaviorSubject เก็บ search term
 * แล้ว pipe ผ่าน debounceTime, distinctUntilChanged, switchMap, map
 * เพื่อ filter รายการสัตว์เลี้ยงแบบ reactive
 */
@Injectable({ providedIn: 'root' })
export class PetSearchService {
  private readonly petsStore = inject(PetsStore);

  // Section 16: BehaviorSubject เก็บ search term ปัจจุบัน
  private readonly searchTermSubject = new BehaviorSubject<string>('');
  private readonly speciesFilterSubject = new BehaviorSubject<string>('All');

  // Public observables ให้ component subscribe
  readonly searchTerm$: Observable<string> = this.searchTermSubject.asObservable();
  readonly speciesFilter$: Observable<string> = this.speciesFilterSubject.asObservable();

  /**
   * Section 16 & 17: Observable pipeline ใช้ RxJS operators
   * - debounceTime: รอ 300ms ก่อน search เพื่อลด request
   * - distinctUntilChanged: ไม่ search ซ้ำถ้า value เหมือนเดิม
   * - switchMap: เปลี่ยน search stream → pet filter stream
   * - map: แปลง array ข้อมูล
   * - combineLatest: รวม search term + species filter
   * - startWith: emit ค่าเริ่มต้นทันที
   */
  readonly filteredPets$: Observable<Pet[]> = combineLatest([
    this.searchTermSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ),
    this.speciesFilterSubject.pipe(
      distinctUntilChanged()
    ),
  ]).pipe(
    switchMap(([term, species]) =>
      // สร้าง Observable จาก array ปัจจุบัน
      new Observable<Pet[]>(observer => {
        const allPets = this.petsStore.pets();

        // Section 17: map + filter operators logic
        const filtered = allPets
          .filter(pet => species === 'All' || pet.species === species)
          .filter(pet => {
            if (!term) return true;
            const q = term.toLowerCase();
            return (
              pet.name.toLowerCase().includes(q) ||
              (pet.breed ?? '').toLowerCase().includes(q) ||
              pet.species.toLowerCase().includes(q)
            );
          });

        observer.next(filtered);
        observer.complete();
      })
    ),
    // startWith: ให้มีค่า initial ทันที ไม่รอ debounce
    startWith([] as Pet[])
  );

  /** ผลสรุปสถิติจาก Observable */
  readonly stats$: Observable<{ total: number; bySpecies: Record<string, number> }> =
    this.filteredPets$.pipe(
      map(pets => ({
        total: pets.length,
        bySpecies: pets.reduce((acc, pet) => {
          acc[pet.species] = (acc[pet.species] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      }))
    );

  setSearchTerm(term: string): void {
    this.searchTermSubject.next(term);
  }

  setSpeciesFilter(species: string): void {
    this.speciesFilterSubject.next(species);
  }

  reset(): void {
    this.searchTermSubject.next('');
    this.speciesFilterSubject.next('All');
  }
}
