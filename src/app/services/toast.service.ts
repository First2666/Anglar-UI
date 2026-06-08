import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

let counter = 0;

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  success(message: string, duration = 4000) {
    this._add(message, 'success', duration);
  }

  error(message: string, duration = 5000) {
    this._add(message, 'error', duration);
  }

  info(message: string, duration = 4000) {
    this._add(message, 'info', duration);
  }

  warning(message: string, duration = 4500) {
    this._add(message, 'warning', duration);
  }

  /** Drop-in helper: guess type from message content */
  open(message: string, _action?: string, _config?: any) {
    const msg = message.toLowerCase();
    const isError = msg.includes('กรุณา') || msg.includes('ล้มเหลว') || msg.includes('ผิดพลาด') || msg.includes('ไม่พบ') || msg.includes('ไม่สำเร็จ');
    const isWarning = msg.includes('แจ้งเตือน') || msg.includes('ระวัง');
    if (isError) {
      this.error(message.replace(' ✓', ''));
    } else if (isWarning) {
      this.warning(message.replace(' ✓', ''));
    } else {
      this.success(message.replace(' ✓', ''));
    }
  }

  dismiss(id: string) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private _add(message: string, type: ToastType, duration: number) {
    const id = `toast_${++counter}`;
    this.toasts.update(list => [...list, { id, message, type, duration }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
