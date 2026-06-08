import { MatTooltipModule } from '@angular/material/tooltip';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule],
    templateUrl: './login.html',
    styleUrl: './login.scss',
})
export class Login {
    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly snack = inject(MatSnackBar);

    readonly hidePassword = signal(true);
    readonly loading = signal(false);
    readonly error = signal('');
    userFocus = false;
    passFocus = false;

    readonly form = this.fb.nonNullable.group({
        username: ['', [Validators.required]],
        password: ['', [Validators.required]],
    });

    readonly demoUsers = [
        { username: 'admin', password: 'admin123', role: 'ผู้ดูแลระบบ', icon: 'admin_panel_settings' },
        { username: 'dr.araya', password: 'vet123', role: 'สัตวแพทย์', icon: 'medical_services' },
        { username: 'somchai', password: 'own123', role: 'เจ้าของสัตว์', icon: 'person' },
    ];

    login() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.loading.set(true);
        this.error.set('');
        const { username, password } = this.form.getRawValue();

        setTimeout(() => {
            const success = this.auth.login(username, password);
            this.loading.set(false);
            if (success) {
                this.router.navigate(['/dashboard']);
            } else {
                this.error.set('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
                this.snack.open('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'ปิด', { duration: 3000 });
            }
        }, 400);
    }

    fillDemo(username: string, password: string) {
        this.form.setValue({ username, password });
        this.error.set('');
    }
}
