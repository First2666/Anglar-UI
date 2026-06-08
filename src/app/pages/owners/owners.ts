import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TemplateRef, ViewChild } from '@angular/core';
import { Owners as OwnersStore } from '../../data/owners';
import { Pets } from '../../data/pets';
import { Appointments } from '../../data/appointments';
import { MedicalRecords } from '../../data/medical-records';
import { DatePipe, SlicePipe } from '@angular/common';

@Component({
  selector: 'app-owners',
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatTableModule, MatSnackBarModule, MatTooltipModule, MatDialogModule, DatePipe, SlicePipe],
  templateUrl: './owners.html',
  styleUrl: './owners.scss',
})
export class Owners {
  private readonly fb = inject(FormBuilder);
  private readonly ownersStore = inject(OwnersStore);
  private readonly snack = inject(MatSnackBar);
  readonly dialog = inject(MatDialog);

  @ViewChild('formDialog') formDialogTemplate!: TemplateRef<any>;
  @ViewChild('detailsDialog') detailsDialogTemplate!: TemplateRef<any>;

  private readonly petsStore = inject(Pets);
  private readonly apptStore = inject(Appointments);
  private readonly recordsStore = inject(MedicalRecords);

  readonly editingId = signal<string | null>(null);
  readonly viewingId = signal<string | null>(null);
  readonly searchQuery = signal('');

  // ── Computed data for details dialog ──
  readonly viewedOwner = computed(() => this.ownersStore.getById(this.viewingId() ?? ''));
  readonly viewedPets = computed(() => this.petsStore.pets().filter((p) => p.ownerId === this.viewingId()));
  readonly viewedAppts = computed(() => this.apptStore.appointments().filter((a) => a.ownerId === this.viewingId()).sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()));
  readonly viewedRecords = computed(() => this.recordsStore.records().filter((r) => r.ownerId === this.viewingId()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));


  readonly owners = computed(() => this.ownersStore.owners());

  readonly filteredOwners = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.owners();
    return this.owners().filter(
      (o) =>
        o.fullName.toLowerCase().includes(q) ||
        (o.phone ?? '').includes(q) ||
        (o.email ?? '').toLowerCase().includes(q)
    );
  });

  readonly displayedColumns = ['fullName', 'phone', 'email', 'address', 'actions'] as const;

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    email: ['', [Validators.email]],
    address: [''],
  });

  constructor() {
    this.ownersStore.ensureSeed();

    effect(() => {
      const id = this.editingId();
      if (!id) return;
      const owner = this.ownersStore.getById(id);
      if (!owner) return;
      this.form.patchValue({
        fullName: owner.fullName,
        phone: owner.phone ?? '',
        email: owner.email ?? '',
        address: owner.address ?? '',
      });
    });
  }

  startCreate() {
    this.editingId.set(null);
    this.form.reset({ fullName: '', phone: '', email: '', address: '' });
    this.dialog.open(this.formDialogTemplate, { panelClass: 'minimal-dialog', width: '90vw', maxWidth: '600px' });
  }

  startEdit(id: string) {
    this.editingId.set(id);
    this.dialog.open(this.formDialogTemplate, { panelClass: 'minimal-dialog', width: '90vw', maxWidth: '600px' });
  }

  closeForm() {
    this.dialog.closeAll();
    this.editingId.set(null);
  }

  viewDetails(id: string) {
    this.viewingId.set(id);
    this.dialog.open(this.detailsDialogTemplate, { panelClass: 'minimal-dialog', width: '90vw', maxWidth: '800px' });
  }

  closeDetails() {
    this.dialog.closeAll();
    this.viewingId.set(null);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const id = this.ownersStore.upsert({
      id: this.editingId() ?? undefined,
      fullName: raw.fullName,
      phone: raw.phone,
      email: raw.email,
      address: raw.address,
    });
    this.editingId.set(id);
    this.closeForm(); // Hide form after saving
    this.snack.open('Saved owner', 'OK', { duration: 1500 });
  }

  remove(id: string) {
    this.ownersStore.remove(id);
    if (this.editingId() === id) this.startCreate();
    this.snack.open('Deleted owner', 'OK', { duration: 1500 });
  }
}
