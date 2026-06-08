import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CartService } from '../../services/cart.service';
import { CartItem } from '../../models/product';

@Component({
  selector: 'app-cart',
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  private readonly cartSvc = inject(CartService);
  private readonly router = inject(Router);

  readonly items = this.cartSvc.items;
  readonly totalItems = this.cartSvc.totalItems;
  readonly totalPrice = this.cartSvc.totalPrice;

  increment(item: CartItem) {
    if (item.quantity < item.product.stock) {
      this.cartSvc.updateQuantity(item.product.id, item.quantity + 1);
    }
  }

  decrement(item: CartItem) {
    this.cartSvc.updateQuantity(item.product.id, item.quantity - 1);
  }

  remove(item: CartItem) {
    this.cartSvc.removeFromCart(item.product.id);
  }

  clearAll() {
    this.cartSvc.clearCart();
  }

  goToShop() {
    this.router.navigate(['/shop']);
  }

  goToCheckout() {
    this.router.navigate(['/shop/checkout']);
  }
}
