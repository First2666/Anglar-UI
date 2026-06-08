import { MatTooltipModule } from '@angular/material/tooltip';
import { Component, inject } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { RolePipe } from '../../pipes/role.pipe';

@Component({
    selector: 'app-profile',
    imports: [DatePipe, MatCardModule, MatIconModule, MatButtonModule, MatListModule, MatSnackBarModule, NgClass, MatTooltipModule, RolePipe],
    templateUrl: './profile.html',
    styleUrl: './profile.scss',
})
export class Profile {
    readonly auth = inject(AuthService);
    private readonly snack = inject(MatSnackBar);

    // RolePipe (Section 07) is now used directly in the template via | roleLabel pipe

    handleAction(action: string) {
        this.snack.open(`✓ ${action}สำเร็จ`, 'ตกลง', { duration: 1500 });
    }
}
