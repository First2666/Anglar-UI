import { Injectable, signal, computed, inject } from '@angular/core';
import { CartItem, Order, OrderStatus, Product } from '../models/product';
import { Products } from '../data/products';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly productsStore = inject(Products);
  private readonly _items = signal<CartItem[]>(this.loadCart());

  // ── Derived signals ──────────────────────────────────
  readonly items = this._items.asReadonly();

  readonly totalItems = computed(() =>
    this._items().reduce((sum, i) => sum + i.quantity, 0)
  );

  readonly totalPrice = computed(() =>
    this._items().reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  );

  // ── Orders history (stored in-memory / localStorage) ──
  private readonly _orders = signal<Order[]>(this.loadOrders());
  readonly orders = this._orders.asReadonly();

  // ── Cart operations ──────────────────────────────────
  addToCart(product: Product, qty = 1) {
    const current = this._items();
    const idx = current.findIndex(i => i.product.id === product.id);
    let updated: CartItem[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + qty };
    } else {
      updated = [...current, { product, quantity: qty }];
    }
    this._items.set(updated);
    this.saveCart(updated);
  }

  updateQuantity(productId: string, qty: number) {
    if (qty <= 0) {
      this.removeFromCart(productId);
      return;
    }
    const updated = this._items().map(i =>
      i.product.id === productId ? { ...i, quantity: qty } : i
    );
    this._items.set(updated);
    this.saveCart(updated);
  }

  removeFromCart(productId: string) {
    const updated = this._items().filter(i => i.product.id !== productId);
    this._items.set(updated);
    this.saveCart(updated);
  }

  clearCart() {
    this._items.set([]);
    this.saveCart([]);
  }

  // ── Order operations ─────────────────────────────────
  placeOrder(
    address: string,
    phone: string,
    paymentMethod: 'cash' | 'transfer' | 'cod',
    note?: string
  ): Order {
    const order: Order = {
      id: `ORD-${Date.now()}`,
      items: [...this._items()],
      totalPrice: this.totalPrice(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      address,
      contactPhone: phone,
      paymentMethod,
      note,
    };

    // Decrease stock for each item in the order
    order.items.forEach(item => {
      const currentProduct = this.productsStore.getById(item.product.id);
      if (currentProduct) {
        const newStock = Math.max(0, currentProduct.stock - item.quantity);
        this.productsStore.update(item.product.id, { stock: newStock });
      }
    });

    const updated = [order, ...this._orders()];
    this._orders.set(updated);
    this.saveOrders(updated);
    this.clearCart();
    return order;
  }

  updateOrderStatus(orderId: string, status: OrderStatus) {
    const updated = this._orders().map(o =>
      o.id === orderId ? { ...o, status } : o
    );
    this._orders.set(updated);
    this.saveOrders(updated);
  }

  cancelOrder(orderId: string) {
    this.updateOrderStatus(orderId, 'cancelled');
  }

  // ── Persistence ──────────────────────────────────────
  private saveCart(items: CartItem[]) {
    try {
      localStorage.setItem('petClinic.cart', JSON.stringify(items));
    } catch { /* ignore */ }
  }

  private loadCart(): CartItem[] {
    try {
      const raw = localStorage.getItem('petClinic.cart');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveOrders(orders: Order[]) {
    try {
      localStorage.setItem('petClinic.orders', JSON.stringify(orders));
    } catch { /* ignore */ }
  }

  private loadOrders(): Order[] {
    try {
      const raw = localStorage.getItem('petClinic.orders');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
