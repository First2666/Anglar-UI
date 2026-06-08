import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

export interface AlertData {
  message: string;
  type: AlertType;
  action?: string;
}

@Component({
  selector: 'app-snackbar-alert',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="alert-premium-container" [class]="data.type">
      <div class="alert-glow"></div>
      <div class="alert-content">
        <div class="alert-icon-wrap">
          <div class="icon-pulse"></div>
          <mat-icon>{{ getIcon() }}</mat-icon>
        </div>
        <div class="alert-text-stack">
          <span class="alert-message">{{ data.message }}</span>
        </div>
      </div>
      
      <div class="alert-actions" *ngIf="data.action">
        <button class="action-btn" (click)="snackBarRef.dismissWithAction()">
          {{ data.action }}
        </button>
      </div>
      
      <button class="close-btn" (click)="snackBarRef.dismiss()">
        <mat-icon>close</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    @keyframes alertPop {
      0% { transform: scale(0.85); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes iconPing {
      0% { transform: scale(0.8); opacity: 0.8; }
      80% { transform: scale(1.8); opacity: 0; }
      100% { transform: scale(2); opacity: 0; }
    }

    .alert-premium-container {
      display: flex;
      align-items: center;
      padding: 12px 14px 12px 18px;
      gap: 16px;
      min-width: 320px;
      max-width: 480px;
      border-radius: 999px; /* Pill shape */
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
      color: #fff;
      font-family: var(--font-family, 'Inter', sans-serif);
      position: relative;
      overflow: hidden;
      animation: alertPop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .alert-glow {
      position: absolute;
      top: 0; left: 0; bottom: 0;
      width: 80px;
      background: radial-gradient(circle at left center, var(--alert-color, rgba(255,255,255,0.2)), transparent 70%);
      opacity: 0.15;
      pointer-events: none;
    }

    .alert-content {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
      z-index: 1;
    }

    .alert-icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: var(--alert-bg, rgba(255, 255, 255, 0.1));
      color: var(--alert-color, #fff);
      position: relative;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        z-index: 2;
      }
    }

    .icon-pulse {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: var(--alert-color);
      animation: iconPing 2s cubic-bezier(0, 0, 0.2, 1) infinite;
      z-index: 1;
    }

    .alert-text-stack {
      display: flex;
      flex-direction: column;
    }

    .alert-message {
      font-size: 14.5px;
      font-weight: 600;
      line-height: 1.4;
      letter-spacing: -0.01em;
      color: rgba(255, 255, 255, 0.95);
    }

    .alert-actions {
      z-index: 1;
    }

    .action-btn {
      height: 36px;
      padding: 0 16px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 999px;
      background: var(--alert-bg-heavy, rgba(255, 255, 255, 0.1));
      color: var(--alert-color-bright, #fff);
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: var(--alert-color, rgba(255, 255, 255, 0.2));
        color: #000;
      }
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.4);
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      z-index: 1;
      margin-left: -8px;
      
      &:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
      }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    /* Types Styling Variables */
    .success { 
      --alert-color: #10b981; 
      --alert-color-bright: #34d399;
      --alert-bg: rgba(16, 185, 129, 0.15); 
      --alert-bg-heavy: rgba(16, 185, 129, 0.25);
    }
    .error { 
      --alert-color: #ef4444; 
      --alert-color-bright: #f87171;
      --alert-bg: rgba(239, 68, 68, 0.15); 
      --alert-bg-heavy: rgba(239, 68, 68, 0.25);
    }
    .info { 
      --alert-color: #3b82f6; 
      --alert-color-bright: #60a5fa;
      --alert-bg: rgba(59, 130, 246, 0.15); 
      --alert-bg-heavy: rgba(59, 130, 246, 0.25);
    }
    .warning { 
      --alert-color: #f59e0b; 
      --alert-color-bright: #fbbf24;
      --alert-bg: rgba(245, 158, 11, 0.15); 
      --alert-bg-heavy: rgba(245, 158, 11, 0.25);
    }

    /* Light Theme Contrast */
    :host-context([data-theme='light']) .alert-premium-container {
      background: #ffffff;
      color: #111;
      border: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      
      .alert-message { color: #111; }
      .close-btn { color: rgba(0, 0, 0, 0.3); &:hover { color: #000; background: rgba(0,0,0,0.05); } }
      .action-btn { 
        background: rgba(0, 0, 0, 0.04); 
        color: #111; 
        &:hover { background: var(--alert-color); color: #fff; } 
      }
    }
  `]
})
export class SnackbarAlertComponent {
  public readonly snackBarRef = inject(MatSnackBarRef<SnackbarAlertComponent>);
  
  constructor(@Inject(MAT_SNACK_BAR_DATA) public data: AlertData) {}

  getIcon(): string {
    switch (this.data.type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  }
}
