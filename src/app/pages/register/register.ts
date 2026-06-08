import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import type { UserRole } from '../../models/user';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pw = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pw === confirm ? null : { mismatch: true };
}

@Component({
    selector: 'app-register',
    imports: [ReactiveFormsModule, MatIconModule, MatSnackBarModule, RouterLink],
    templateUrl: './register.html',
    styleUrl: './register.scss',
})
export class Register {
    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly snack = inject(MatSnackBar);

    readonly loading = signal(false);
    readonly error = signal('');
    readonly success = signal(false);
    readonly hidePassword = signal(true);
    readonly hideConfirm = signal(true);
    readonly selectedRole = signal<UserRole>('owner');

    focused: Record<string, boolean> = {};

    readonly roles: { value: UserRole; label: string; icon: string; desc: string; color: string }[] = [
        { value: 'admin', label: 'แอดมิน', icon: 'admin_panel_settings', desc: 'จัดการระบบทั้งหมด', color: '#f59e0b' },
        { value: 'vet', label: 'สัตวแพทย์', icon: 'medical_services', desc: 'ดูแลบันทึกการรักษา', color: '#10b981' },
        { value: 'owner', label: 'เจ้าของสัตว์เลี้ยง', icon: 'person', desc: 'ดูนัดหมายและสัตว์เลี้ยง', color: '#8b5cf6' },
    ];

    readonly form = this.fb.nonNullable.group(
        {
            fullName: ['', [Validators.required, Validators.minLength(3)]],
            username: ['', [Validators.required, Validators.minLength(4), Validators.pattern(/^[a-zA-Z0-9._]+$/)]],
            email: ['', [Validators.email]],
            phone: [''],
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required]],
        },
        { validators: passwordMatchValidator }
    );

    selectRole(role: UserRole) {
        this.selectedRole.set(role);
    }

    register() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.loading.set(true);
        this.error.set('');

        const v = this.form.getRawValue();

        setTimeout(() => {
            const result = this.auth.register({
                username: v.username,
                password: v.password,
                fullName: v.fullName,
                email: v.email || undefined,
                phone: v.phone || undefined,
                role: this.selectedRole(),
            });

            this.loading.set(false);

            if (result.success) {
                this.success.set(true);
                this.snack.open('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ', 'ปิด', { duration: 4000 });
                setTimeout(() => this.router.navigate(['/login']), 1800);
            } else {
                this.error.set(result.error ?? 'เกิดข้อผิดพลาด');
            }
        }, 600);
    }

    getRoleInfo(role: UserRole) {
        return this.roles.find(r => r.value === role);
    }

    hasError(field: string, error: string): boolean {
        const ctrl = this.form.get(field);
        return !!(ctrl?.hasError(error) && ctrl.touched);
    }

    get mismatch(): boolean {
        return !!(this.form.hasError('mismatch') && this.form.get('confirmPassword')?.touched);
    }
}
