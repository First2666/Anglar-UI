import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast.service';
import { ToastCardComponent } from '../toast-card/toast-card.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, ToastCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-container">
      @for (toast of toastSvc.toasts(); track toast.id) {
        <app-toast-card [toast]="toast" />
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      display: flex;
      flex-direction: column-reverse;
      gap: 10px;
      align-items: center;
      pointer-events: none;

      app-toast-card {
        pointer-events: all;
      }
    }
  `]
})
export class ToastContainerComponent {
  readonly toastSvc = inject(ToastService);
}
