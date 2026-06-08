import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Pet } from '../../../models/pet';
import { MedicalRecord } from '../../../models/medical-record';
import { SpeciesIconPipe } from '../../../pipes/species-icon.pipe';

export interface PetDialogData {
  pet: Pet;
  ownerName: string;
  records: MedicalRecord[];
  age: string;
  speciesThai: string;
}

@Component({
  selector: 'app-pet-details-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, SpeciesIconPipe],
  templateUrl: './pet-details-dialog.html',
  styleUrl: './pet-details-dialog.scss',
})
export class PetDetailsDialog {
  readonly dialogRef = inject(MatDialogRef<PetDetailsDialog>);
  readonly data = inject<PetDialogData>(MAT_DIALOG_DATA);

  readonly currentPhotoIndex = signal(0);

  nextPhoto() {
    const urls = this.data.pet.photoUrls;
    if (!urls || urls.length <= 1) return;
    this.currentPhotoIndex.update(i => (i + 1) % urls.length);
  }

  prevPhoto() {
    const urls = this.data.pet.photoUrls;
    if (!urls || urls.length <= 1) return;
    this.currentPhotoIndex.update(i => i === 0 ? urls.length - 1 : i - 1);
  }

  close() {
    this.dialogRef.close();
  }
}
