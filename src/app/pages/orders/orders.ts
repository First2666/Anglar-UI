import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../components/shared/confirm-dialog/confirm-dialog';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { Order, OrderStatus } from '../../models/product';

@Component({
  selector: 'app-orders',
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, MatDialogModule],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders {
  private readonly cartSvc = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly isAdmin = computed(() => this.auth.role === 'admin');

  readonly orders = this.cartSvc.orders;
  expandedId = signal<string | null>(null);

  readonly statusConfig: Record<OrderStatus, { label: string; icon: string; color: string }> = {
    pending:   { label: 'รอยืนยัน',      icon: 'schedule',      color: '#f59e0b' },
    confirmed: { label: 'ยืนยันแล้ว',    icon: 'check_circle',  color: '#3b82f6' },
    packing:   { label: 'กำลังแพ็คสินค้า', icon: 'inventory',   color: '#8b5cf6' },
    shipped:   { label: 'กำลังจัดส่ง',   icon: 'local_shipping', color: '#06b6d4' },
    delivered: { label: 'จัดส่งแล้ว',    icon: 'done_all',      color: '#10b981' },
    cancelled: { label: 'ยกเลิกแล้ว',    icon: 'cancel',        color: '#ef4444' },
  };

  readonly paymentLabel: Record<string, string> = {
    cod: 'เก็บเงินปลายทาง',
    transfer: 'โอนเงิน',
    cash: 'เงินสด',
  };

  toggle(id: string) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  cancelOrder(order: Order) {
    if (order.status === 'delivered' || order.status === 'cancelled') return;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'ยืนยันการยกเลิก',
        message: 'คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคำสั่งซื้อนี้?',
        confirmText: 'ยกเลิกคำสั่งซื้อ',
        icon: 'cancel',
        iconColor: '#ef4444'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cartSvc.updateOrderStatus(order.id, 'cancelled');
      }
    });
  }

  updateStatus(orderId: string, status: OrderStatus) {
    this.cartSvc.updateOrderStatus(orderId, status);
  }

  goToShop() {
    this.router.navigate(['/shop']);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
