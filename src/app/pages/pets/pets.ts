
import { Component, computed, effect, inject, signal, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { petNameValidator } from '../../validators/pet-validators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { ToastService } from '../../services/toast.service';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MedicalRecords } from '../../data/medical-records';
import { Owners } from '../../data/owners';
import { Pets as PetsStore } from '../../data/pets';
import { AuthService } from '../../services/auth.service';
import type { Pet, PetSpecies, PetSex } from '../../models/pet';
import { PetDetailsDialog } from './pet-details-dialog/pet-details-dialog';
import { SpeciesIconPipe } from '../../pipes/species-icon.pipe';

@Component({
  selector: 'app-pets',
  imports: [ReactiveFormsModule, MatDialogModule, MatMenuModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatTableModule, MatTooltipModule, MatDatepickerModule, MatNativeDateModule, SpeciesIconPipe],
  templateUrl: './pets.html',
  styleUrl: './pets.scss',
})
export class Pets {
  @ViewChild('formDialog') formDialogTemplate!: TemplateRef<any>;
  private readonly fb = inject(FormBuilder);
  private readonly ownersStore = inject(Owners);
  private readonly petsStore = inject(PetsStore);
  private readonly toast = inject(ToastService);
  private readonly recordsStore = inject(MedicalRecords);
  readonly dialog = inject(MatDialog);
  readonly auth = inject(AuthService);

  readonly editingId = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly speciesFilter = signal<PetSpecies | 'All'>('All');

  readonly isOwner = computed(() => this.auth.role === 'owner');
  readonly canEdit = computed(() => true); // Admin, Vet, and Owner can edit/create
  
  userFullName() {
    return this.auth.fullName;
  }

  readonly owners = computed(() => this.ownersStore.owners());
  readonly pets = computed(() => this.petsStore.pets());
  readonly records = computed(() => this.recordsStore.records());
  readonly ownerNameById = computed(() => new Map(this.owners().map((o) => [o.id, o.fullName] as const)));

  readonly editingPetRecords = computed(() => {
    const id = this.editingId();
    if (!id) return [];
    return this.records().filter(r => r.petId === id).sort((a,b) => b.date.localeCompare(a.date));
  });

  /** Owner sees only their own pets */
  readonly scopedPets = computed(() => {
    if (this.auth.role === 'owner') {
      const ownerId = this.auth.linkedOwnerId;
      return ownerId ? this.pets().filter(p => p.ownerId === ownerId) : [];
    }
    return this.pets();
  });

  readonly filteredPets = computed(() => {
    let list = this.scopedPets();
    const sf = this.speciesFilter();
    if (sf !== 'All') list = list.filter((p) => p.species === sf);
    const q = this.searchQuery().toLowerCase();
    if (q) list = list.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.breed ?? '').toLowerCase().includes(q) ||
        (this.ownerNameById().get(p.ownerId) ?? '').toLowerCase().includes(q)
    );
    return list;
  });

  readonly displayedColumns = computed(() => {
    if (this.isOwner()) return ['name', 'species', 'breed', 'age'] as const;
    return ['name', 'species', 'breed', 'age', 'owner', 'actions'] as const;
  });

  readonly speciesOptions: readonly PetSpecies[] = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'] as const;
  readonly speciesFilterOptions: readonly (PetSpecies | 'All')[] = ['All', ...this.speciesOptions];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1), petNameValidator()]],
    species: this.fb.nonNullable.control<PetSpecies>('Dog', [Validators.required]),
    breed: [''],
    sex: this.fb.nonNullable.control<PetSex>('Unknown'),
    neutered: [false],
    microchip: [''],
    birthDate: [''],
    ownerId: ['', [Validators.required]],
    notes: [''],
    photoUrls: this.fb.nonNullable.control<string[]>([]),
  });

  readonly photoFileNames = signal<string[]>([]);

  // Track the current photo index for each pet in the grid view
  readonly gridPhotoIndices = signal<Record<string, number>>({});

  constructor() {
    this.ownersStore.ensureSeed();
    effect(() => {
      const ownerIds = this.owners().map((o) => o.id);
      if (ownerIds.length >= 2) this.petsStore.ensureSeed(ownerIds);
      if (!this.form.controls.ownerId.value && ownerIds[0]) this.form.controls.ownerId.setValue(ownerIds[0]);
    });

    effect(() => {
      const id = this.editingId();
      if (!id) return;
      const pet = this.petsStore.getById(id);
      if (!pet) return;
      this.form.patchValue({
        name: pet.name, species: pet.species, breed: pet.breed ?? '',
        sex: pet.sex ?? 'Unknown',
        neutered: pet.neutered ?? false,
        microchip: pet.microchip ?? '',
        birthDate: pet.birthDate ?? '', ownerId: pet.ownerId, notes: pet.notes ?? '',
        photoUrls: pet.photoUrls ?? [],
      });
    });
  }

  startCreate() {
    this.editingId.set(null);
    let defaultOwnerId = '';
    if (this.auth.role === 'owner') {
      defaultOwnerId = this.auth.linkedOwnerId || '';
    } else {
      defaultOwnerId = this.owners()[0]?.id ?? '';
    }
    this.form.reset({ name: '', species: 'Dog', breed: '', sex: 'Unknown', neutered: false, microchip: '', birthDate: '', ownerId: defaultOwnerId, notes: '', photoUrls: [] });
    this.photoFileNames.set([]);
    this.dialog.open(this.formDialogTemplate, { panelClass: 'minimal-dialog', width: '90vw', maxWidth: '800px' });
  }

  startEdit(id: string) { 
    this.editingId.set(id); 
    this.photoFileNames.set([]); // Reset for edit as we don't have original filenames
    this.dialog.open(this.formDialogTemplate, { panelClass: 'minimal-dialog', width: '90vw', maxWidth: '800px' });
  }

  closeForm() {
    this.dialog.closeAll();
    this.editingId.set(null);
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    const id = this.petsStore.upsert({
      id: this.editingId() ?? undefined, name: raw.name, species: raw.species,
      breed: raw.breed, 
      sex: raw.sex, neutered: raw.neutered, microchip: raw.microchip,
      birthDate: raw.birthDate || undefined, ownerId: raw.ownerId, notes: raw.notes,
      photoUrls: raw.photoUrls.length > 0 ? raw.photoUrls : undefined,
    });
    this.editingId.set(id);
    this.closeForm(); // Hide form after saving
    this.toast.success('บันทึกข้อมูลสัตว์เลี้ยงแล้ว');
  }

  remove(id: string) {
    this.petsStore.remove(id);
    if (this.editingId() === id) this.startCreate();
    this.toast.success('ลบข้อมูลสัตว์เลี้ยงแล้ว');
  }

  onPhotoSelected(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files || []);
    if (!files.length) return;
    
    // Check if they are images
    if (files.some(f => !f.type.startsWith('image/'))) {
      this.toast.error('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น');
      return;
    }

    const currentUrls = this.form.getRawValue().photoUrls || [];
    const readPromises = files.map(file => {
       return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
       });
    });

    Promise.all(readPromises).then(newUrls => {
       this.form.patchValue({ photoUrls: [...currentUrls, ...newUrls] });
       this.photoFileNames.update(names => [...names, ...files.map(f => f.name)]);
       // Reset input value so same file can be selected again
       (event.target as HTMLInputElement).value = '';
    });
  }

  removePhoto(index: number) {
    const currentUrls = [...(this.form.getRawValue().photoUrls || [])];
    currentUrls.splice(index, 1);
    this.form.patchValue({ photoUrls: currentUrls });
    
    this.photoFileNames.update(names => {
      const copy = [...names];
      copy.splice(index, 1);
      return copy;
    });
  }

  nextGridPhoto(petId: string, maxLen: number, event: Event) {
    event.stopPropagation();
    this.gridPhotoIndices.update(d => {
       const cur = d[petId] || 0;
       return { ...d, [petId]: (cur + 1) % maxLen };
    });
  }

  prevGridPhoto(petId: string, maxLen: number, event: Event) {
    event.stopPropagation();
    this.gridPhotoIndices.update(d => {
       const cur = d[petId] || 0;
       return { ...d, [petId]: cur === 0 ? maxLen - 1 : cur - 1 };
    });
  }

  ownerName(ownerId: string) { return this.ownerNameById().get(ownerId) ?? 'ไม่ทราบ'; }

  age(birthDate: string | undefined) {
    if (!birthDate) return '—';
    const diff = Date.now() - Date.parse(birthDate);
    const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
    if (months < 12) return `${months} เดือน`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years} ปี ${rem} เดือน` : `${years} ปี`;
  }


  speciesThai(s: PetSpecies | string) {
    const map: Record<string, string> = { Dog: 'สุนัข', Cat: 'แมว', Bird: 'นก', Rabbit: 'กระต่าย', Other: 'อื่นๆ', All: 'ทั้งหมด' };
    return map[s] ?? s;
  }

  openPetDetails(pet: Pet) {
    const records = this.records().filter((r) => r.petId === pet.id).sort((a,b) => b.date.localeCompare(a.date));
    this.dialog.open(PetDetailsDialog, {
      width: '90vw',
      maxWidth: '500px',
      panelClass: 'responsive-dialog',
      data: {
        pet,
        ownerName: this.ownerName(pet.ownerId),
        records,
        age: this.age(pet.birthDate),
        speciesThai: this.speciesThai(pet.species)
      }
    });
  }

  handleAction(action: string) {
    this.toast.success(`${action}สำเร็จ`);
  }
}
