import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Product, ProductCategory } from '../../../models/product';

@Component({
  selector: 'app-product-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './product-edit-dialog.html',
  styleUrl: './product-edit-dialog.scss',
})
export class ProductEditDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ProductEditDialog>);
  private readonly snack = inject(MatSnackBar);
  readonly data = inject<{ product?: Product }>(MAT_DIALOG_DATA);

  readonly isEdit = !!this.data?.product;
  readonly selectedFileName = signal<string>('');
  readonly previewUrl = signal<string>(this.data?.product?.imageUrl ?? '');
  
  readonly categories: ProductCategory[] = [
    'อาหารสุนัข',
    'อาหารแมว',
    'อาหารนก',
    'อาหารกระต่าย',
    'ของเล่น',
    'อุปกรณ์ดูแล',
    'วิตามิน/ยา',
    'อื่นๆ',
  ];

  readonly form = this.fb.group({
    name: [this.data?.product?.name ?? '', [Validators.required]],
    description: [this.data?.product?.description ?? '', [Validators.required]],
    price: [this.data?.product?.price ?? 0, [Validators.required, Validators.min(0)]],
    category: [this.data?.product?.category ?? 'อื่นๆ', [Validators.required]],
    imageUrl: [this.data?.product?.imageUrl ?? ''],
    stock: [this.data?.product?.stock ?? 0, [Validators.required, Validators.min(0)]],
    unit: [this.data?.product?.unit ?? 'ชิ้น', [Validators.required]],
    brand: [this.data?.product?.brand ?? ''],
  });

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.selectedFileName.set(file.name);

    if (!file.type.startsWith('image/')) {
      // In a real app we'd show a snackbar here, but this dialog doesn't inject it yet.
      // We can use alert for simplicity or just ignore.
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      console.log('File read successfully, updating preview...');
      const result = reader.result as string;
      this.previewUrl.set(result);
      this.form.patchValue({ imageUrl: result });
      // Reset input value so same file can be selected again
      (event.target as HTMLInputElement).value = '';
    };
    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      this.snack.open('เกิดข้อผิดพลาดในการอ่านไฟล์', 'ตกลง', { duration: 2000 });
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.form.patchValue({ imageUrl: '' });
    this.previewUrl.set('');
    this.selectedFileName.set('');
  }

  onSave() {
    if (this.form.invalid) return;
    
    const val = this.form.value;
    const result: Partial<Product> = {
      ...this.data?.product,
      ...val,
    } as Product;
    
    this.dialogRef.close(result);
  }

  onCancel() {
    this.dialogRef.close();
  }
}
