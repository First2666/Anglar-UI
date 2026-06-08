import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Section 13 – Custom Form Validators
 * validators/pet-age.validator.ts
 */

/** Validate อายุสัตว์เลี้ยง: ต้องอยู่ระหว่าง 0–30 ปี */
export function petAgeValidator(min = 0, max = 30): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (isNaN(num)) return { petAge: { message: 'อายุต้องเป็นตัวเลข' } };
    if (num < min) return { petAge: { message: `อายุต้องไม่น้อยกว่า ${min} ปี` } };
    if (num > max) return { petAge: { message: `อายุต้องไม่เกิน ${max} ปี` } };
    return null;
  };
}

/** Validate เบอร์โทรศัพท์ไทย: ขึ้นต้นด้วย 0 ตามด้วยตัวเลข 8-9 หลัก */
export function thaiPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '').toString().replace(/\D/g, '');
    if (!value) return null;
    const valid = /^0[0-9]{8,9}$/.test(value);
    return valid ? null : { thaiPhone: { message: 'เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9-10 หลัก' } };
  };
}

/** Validate ชื่อสัตว์เลี้ยง: ห้ามมีตัวเลขหรืออักขระพิเศษ */
export function petNameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value ?? '';
    if (!value) return null;
    const valid = /^[\u0E00-\u0E7Fa-zA-Z\s'-]{1,50}$/.test(value);
    return valid ? null : { petName: { message: 'ชื่อสัตว์เลี้ยงต้องเป็นตัวอักษรเท่านั้น (ไทย/อังกฤษ)' } };
  };
}
