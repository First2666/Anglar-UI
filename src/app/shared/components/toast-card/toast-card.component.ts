import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast, ToastService, ToastType } from '../../../services/toast.service';

@Component({
  selector: 'app-toast-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-card" [class]="toast.type" [class.exiting]="exiting()">
      <div class="toast-left-bar"></div>

      <div class="toast-icon">
        <div class="icon-ring"></div>
        <span class="material-icons">{{ icon }}</span>
      </div>

      <span class="toast-msg">{{ toast.message }}</span>

      <button class="toast-close" (click)="close()">
        <span class="material-icons">close</span>
      </button>

      <div class="toast-progress" [style.animation-duration.ms]="toast.duration"></div>
    </div>
  `,
  styles: [`
    @keyframes toastIn {
      0%   { transform: translateY(16px) scale(0.95); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    @keyframes toastOut {
      0%   { transform: translateY(0) scale(1); opacity: 1; max-height: 80px; margin-bottom: 10px; }
      100% { transform: translateY(12px) scale(0.95); opacity: 0; max-height: 0; margin-bottom: 0; }
    }
    @keyframes progressShrink {
      from { transform: scaleX(1); }
      to   { transform: scaleX(0); }
    }
    @keyframes ringPing {
      0%   { transform: scale(0.8); opacity: 0.7; }
      80%  { transform: scale(2);   opacity: 0; }
      100% { transform: scale(2.2); opacity: 0; }
    }

    :host {
      display: block;
    }

    .toast-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px 14px 0;
      border-radius: 16px;
      background: #111;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 16px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04);
      color: #fff;
      position: relative;
      overflow: hidden;
      width: 360px;
      max-width: 90vw;
      animation: toastIn 0.4s cubic-bezier(0.16,1,0.3,1) both;
      transition: all 0.3s ease;
    }

    .toast-card.exiting {
      animation: toastOut 0.35s cubic-bezier(0.4,0,1,1) both;
      pointer-events: none;
    }

    /* Left colored accent bar */
    .toast-left-bar {
      width: 4px;
      align-self: stretch;
      border-radius: 0 2px 2px 0;
      background: var(--t-color);
      flex-shrink: 0;
      margin-right: 4px;
    }

    /* Icon */
    .toast-icon {
      position: relative;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--t-bg);
      flex-shrink: 0;

      .material-icons {
        font-size: 18px;
        color: var(--t-color);
        z-index: 2;
        position: relative;
      }
    }

    .icon-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: var(--t-color);
      animation: ringPing 2.2s cubic-bezier(0,0,0.2,1) infinite;
      z-index: 1;
    }

    .toast-msg {
      flex: 1;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.4;
      letter-spacing: -0.01em;
      color: rgba(255,255,255,0.92);
    }

    .toast-close {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.35);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
      padding: 0;

      .material-icons { font-size: 16px; }

      &:hover {
        background: rgba(255,255,255,0.1);
        color: #fff;
      }
    }

    /* Progress bar at bottom */
    .toast-progress {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 2px;
      background: var(--t-color);
      transform-origin: left;
      animation: progressShrink linear both;
      opacity: 0.5;
    }

    /* Type tokens */
    .success { --t-color: #22c55e; --t-bg: rgba(34,197,94,0.12); }
    .error   { --t-color: #ef4444; --t-bg: rgba(239,68,68,0.12); }
    .info    { --t-color: #3b82f6; --t-bg: rgba(59,130,246,0.12); }
    .warning { --t-color: #f59e0b; --t-bg: rgba(245,158,11,0.12); }

    /* Light theme */
    :host-context([data-theme='light']) .toast-card {
      background: #fff;
      border-color: rgba(0,0,0,0.07);
      box-shadow: 0 12px 32px rgba(0,0,0,0.10);
      .toast-msg { color: #111; }
      .toast-close { color: rgba(0,0,0,0.3); &:hover { background: rgba(0,0,0,0.06); color: #111; } }
    }
  `]
})
export class ToastCardComponent implements OnInit, OnDestroy {
  @Input() toast!: Toast;

  exiting = signal(false);

  private svcRef!: ToastService;
  private timer!: ReturnType<typeof setTimeout>;

  constructor(private toastSvc: ToastService) {
    this.svcRef = toastSvc;
  }

  get icon(): string {
    const map: Record<ToastType, string> = {
      success: 'check_circle',
      error: 'error',
      info: 'info',
      warning: 'warning',
    };
    return map[this.toast.type];
  }

  ngOnInit() {}

  close() {
    this.exiting.set(true);
    this.timer = setTimeout(() => this.svcRef.dismiss(this.toast.id), 350);
  }

  ngOnDestroy() {
    clearTimeout(this.timer);
  }
}
