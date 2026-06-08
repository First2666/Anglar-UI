import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SnackbarAlertComponent, AlertType } from '../shared/components/snackbar-alert/snackbar-alert';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private readonly snack = inject(MatSnackBar);

  public success(message: string, action?: string) {
    this.open(message, 'success', action);
  }

  public error(message: string, action?: string) {
    this.open(message, 'error', action);
  }

  public warn(message: string, action?: string) {
    this.open(message, 'warning', action);
  }

  public info(message: string, action?: string) {
    this.open(message, 'info', action);
  }

  private show(message: string, type: AlertType, action?: string) {
    this.snack.openFromComponent(SnackbarAlertComponent, {
      data: { message, type, action },
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['premium-snackbar', `${type}-snackbar`]
    });
  }

  // Drop-in replacement for MatSnackBar's open method
  public open(message: string, action?: string, config?: any) {
    // Basic heuristic: if it contains words like 'กรุณา', 'ไม่พบ', 'ผิดพลาด', treat as error/warn, else success
    const msg = message.toLowerCase();
    const isError = msg.includes('ล้มเหลว') || msg.includes('ผิดพลาด') || msg.includes('ไม่สำเร็จ') || msg.includes('กรุณา');
    this.show(message.replace(' ✓', ''), isError ? 'error' : 'success', action);
    
    // Return a dummy ref to avoid breaking code that expects MatSnackBarRef
    return {
      afterDismissed: () => ({ subscribe: (fn: any) => fn() }),
      onAction: () => ({ subscribe: (fn: any) => fn() })
    } as any;
  }
}

