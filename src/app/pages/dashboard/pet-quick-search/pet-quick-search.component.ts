import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PetSearchService } from '../../../services/pet-search.service';
import { ClinicApiService } from '../../../services/clinic-api.service';

/**
 * Section 11 – Angular Template Driven Forms
 * ใช้ FormsModule + ngModel two-way binding สำหรับ search form
 * (ต่างจาก Reactive Forms ที่ใช้ FormBuilder/FormGroup)
 *
 * Section 16/17: subscribe filteredPets$ Observable
 * Section 18: เรียก fetchDogBreeds() HTTP
 * Section 07: ใช้ RolePipe
 */
@Component({
  selector: 'app-pet-quick-search',
  standalone: true,
  imports: [
    FormsModule,          // Section 11: Template Driven Forms
    AsyncPipe,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="pet-quick-search glass-panel">
      <div class="search-header">
        <mat-icon class="search-icon">pets</mat-icon>
        <h3>ค้นหาสัตว์เลี้ยงด่วน</h3>
        <span class="badge-pill">Section 11 · 16 · 17 · 18</span>
      </div>

      <!-- Section 11: Template Driven Form ด้วย ngModel -->
      <form #searchForm="ngForm" class="search-form" (ngSubmit)="onSearch()">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>ค้นหาชื่อ / สายพันธุ์</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input
            matInput
            name="searchTerm"
            [(ngModel)]="searchTerm"
            (ngModelChange)="onTermChange($event)"
            placeholder="เช่น Max, Labrador..."
            #termCtrl="ngModel"
          />
          @if (searchTerm) {
            <button matSuffix mat-icon-button type="button" (click)="clearSearch()">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>

        <!-- Species filter chips -->
        <div class="species-chips">
          @for (sp of speciesOptions; track sp) {
            <button
              type="button"
              class="chip-btn"
              [class.active]="speciesFilter === sp"
              (click)="setSpecies(sp)"
            >{{ sp === 'All' ? 'ทั้งหมด' : sp }}</button>
          }
        </div>
      </form>

      <!-- Section 16/17: แสดงผล Observable ด้วย async pipe -->
      <div class="search-results">
        @if (petSearch.filteredPets$ | async; as pets) {
          @if (pets.length === 0 && searchTerm) {
            <div class="no-result">
              <mat-icon>search_off</mat-icon>
              <span>ไม่พบสัตว์เลี้ยงที่ค้นหา</span>
            </div>
          }
          @for (pet of pets.slice(0, 5); track pet.id) {
            <div class="pet-chip">
              <mat-icon class="pet-icon">pets</mat-icon>
              <span class="pet-name">{{ pet.name }}</span>
              <span class="pet-species">{{ pet.species }}</span>
            </div>
          }
          @if (pets.length > 5) {
            <div class="more-label">+{{ pets.length - 5 }} รายการ</div>
          }
        }
      </div>

      <!-- Section 18: แสดงผล HTTP – Dog Breed Suggestions -->
      <div class="breed-section">
        <div class="breed-header">
          <mat-icon>info</mat-icon>
          <span>สายพันธุ์แนะนำ (API)</span>
          <button mat-stroked-button type="button" class="load-btn"
            (click)="loadBreeds()"
            [disabled]="apiService.isLoading()"
            matTooltip="Section 18: HttpClient GET dog.ceo/api">
            @if (apiService.isLoading()) {
              <mat-progress-spinner diameter="16" mode="indeterminate"></mat-progress-spinner>
            } @else {
              <mat-icon>download</mat-icon>
            }
            โหลดสายพันธุ์
          </button>
        </div>
        @if (apiService.error()) {
          <div class="api-error">
            <mat-icon>warning</mat-icon>
            <span>{{ apiService.error() }}</span>
          </div>
        }
        @if (breedSuggestions().length > 0) {
          <div class="breed-chips">
            @for (breed of breedSuggestions(); track breed) {
              <span class="breed-tag">{{ breed }}</span>
            }
          </div>
        }
        @if (apiService.catFact()) {
          <div class="cat-fact">
            <mat-icon>lightbulb</mat-icon>
            <em>{{ apiService.catFact() }}</em>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .pet-quick-search {
      padding: 1.5rem;
      border-radius: 16px;
      background: var(--surface-2, rgba(255,255,255,0.05));
      border: 1px solid var(--border-color, rgba(255,255,255,0.1));
    }
    .search-header {
      display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;
      h3 { margin: 0; font-size: 1rem; font-weight: 600; flex: 1; }
    }
    .badge-pill {
      font-size: 0.65rem; background: var(--primary, #7c3aed);
      color: white; padding: 2px 8px; border-radius: 999px;
    }
    .search-icon { color: var(--primary, #7c3aed); }
    .search-form { display: flex; flex-direction: column; gap: 0.75rem; }
    .search-field { width: 100%; }
    .species-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .chip-btn {
      padding: 4px 12px; border-radius: 999px; border: 1px solid var(--border-color, rgba(255,255,255,0.2));
      background: transparent; color: inherit; cursor: pointer; font-size: 0.8rem; transition: all 0.2s;
      &:hover { background: var(--primary, #7c3aed); color: white; }
      &.active { background: var(--primary, #7c3aed); color: white; border-color: var(--primary, #7c3aed); }
    }
    .search-results { margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; min-height: 2rem; }
    .pet-chip {
      display: flex; align-items: center; gap: 0.5rem; padding: 6px 10px;
      border-radius: 8px; background: rgba(255,255,255,0.04); font-size: 0.85rem;
    }
    .pet-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .pet-name { font-weight: 500; }
    .pet-species { color: var(--text-muted, rgba(255,255,255,0.5)); font-size: 0.75rem; }
    .no-result {
      display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted, rgba(255,255,255,0.5));
      font-size: 0.85rem; padding: 0.5rem;
    }
    .more-label { font-size: 0.75rem; color: var(--primary, #7c3aed); padding: 0 0.5rem; }
    .breed-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color, rgba(255,255,255,0.1)); }
    .breed-header {
      display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.85rem;
      span { flex: 1; }
    }
    .load-btn { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; height: 2rem; }
    .breed-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.5rem; }
    .breed-tag {
      font-size: 0.72rem; background: rgba(124,58,237,0.15); color: var(--primary, #7c3aed);
      border: 1px solid rgba(124,58,237,0.3); padding: 2px 8px; border-radius: 999px;
    }
    .api-error { 
      display: flex; align-items: center; gap: 0.4rem;
      color: #e74c3c; font-size: 0.8rem; padding: 0.25rem 0;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }
    .cat-fact {
      display: flex; align-items: flex-start; gap: 0.4rem; margin-top: 0.5rem;
      font-size: 0.8rem; color: var(--text-muted, rgba(255,255,255,0.6)); line-height: 1.4;
      mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; color: #f39c12; flex-shrink: 0; }
    }
  `]
})
export class PetQuickSearchComponent implements OnInit, OnDestroy {
  readonly petSearch = inject(PetSearchService);
  readonly apiService = inject(ClinicApiService);

  // Section 11: ตัวแปรที่ bind กับ ngModel (Template Driven)
  searchTerm = '';
  speciesFilter = 'All';
  readonly speciesOptions = ['All', 'Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];

  // Section 17: ผลลัพธ์จาก breed search
  readonly breedSuggestions = signal<string[]>([]);

  private readonly destroy$ = new Subject<void>();

  ngOnInit() {
    // Section 16: Subscribe observable เมื่อ component init
    this.petSearch.searchTerm$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(term => {
      if (term !== this.searchTerm) this.searchTerm = term;
    });

    // โหลด initial data จาก PetSearchServiceObservable
    this.petSearch.reset();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTermChange(value: string) {
    // Section 16: push ค่าเข้า BehaviorSubject ใน service
    this.petSearch.setSearchTerm(value);
    // Section 17: filter breeds จาก local cache
    this.breedSuggestions.set(this.apiService.searchBreeds(value));
  }

  setSpecies(sp: string) {
    this.speciesFilter = sp;
    this.petSearch.setSpeciesFilter(sp);
  }

  onSearch() {
    this.petSearch.setSearchTerm(this.searchTerm);
  }

  clearSearch() {
    this.searchTerm = '';
    this.petSearch.reset();
    this.breedSuggestions.set([]);
  }

  loadBreeds() {
    // Section 18: เรียก HttpClient ผ่าน ClinicApiService
    this.apiService.fetchDogBreeds().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (breeds) => {
        this.breedSuggestions.set(breeds.slice(0, 8));
      },
      error: () => {}
    });

    // Section 18: เรียก cat facts API ด้วย
    this.apiService.fetchCatFact().pipe(
      takeUntil(this.destroy$)
    ).subscribe();
  }
}
