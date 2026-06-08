import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private readonly cartSvc = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly PREFS_KEY = () => `petClinic.userPrefs.${this.auth.currentUser()?.id || 'guest'}`;

  readonly items = this.cartSvc.items;
  readonly totalPrice = this.cartSvc.totalPrice;
  readonly totalItems = this.cartSvc.totalItems;

  // Form fields
  address = signal('');
  phone = signal('');
  paymentMethod = signal<'cash' | 'transfer' | 'cod'>('cod');
  note = signal('');
  submitted = signal(false);
  orderId = signal('');
  errors = signal<Record<string, string>>({});

  savedAddresses = signal<string[]>([]);
  savedPhones = signal<string[]>([]);

  constructor() {
    this.loadPrefs();
  }

  private loadPrefs() {
    try {
      const raw = localStorage.getItem(this.PREFS_KEY());
      if (raw) {
        const data = JSON.parse(raw);
        this.savedAddresses.set(data.addresses || []);
        this.savedPhones.set(data.phones || []);
        
        // Auto-fill if empty
        if (this.savedAddresses().length > 0 && !this.address()) {
          this.address.set(this.savedAddresses()[0]);
        }
        if (this.savedPhones().length > 0 && !this.phone()) {
          this.phone.set(this.savedPhones()[0]);
        }
      }
    } catch (e) { console.error('Error loading checkout prefs', e); }
  }

  private saveToPrefs(address: string, phone: string) {
    try {
      const addresses = [...new Set([address, ...this.savedAddresses()])].slice(0, 5);
      const phones = [...new Set([phone, ...this.savedPhones()])].slice(0, 5);
      
      this.savedAddresses.set(addresses);
      this.savedPhones.set(phones);
      
      localStorage.setItem(this.PREFS_KEY(), JSON.stringify({ addresses, phones }));
    } catch (e) { console.error('Error saving checkout prefs', e); }
  }

  readonly paymentOptions: { value: 'cash' | 'transfer' | 'cod'; label: string; icon: string; desc: string }[] = [
    { value: 'cod', label: 'เก็บเงินปลายทาง', icon: 'local_shipping', desc: 'ชำระเมื่อรับสินค้า' },
    { value: 'transfer', label: 'โอนเงิน', icon: 'account_balance', desc: 'โอนก่อนจัดส่ง' },
    { value: 'cash', label: 'เงินสด', icon: 'payments', desc: 'ชำระที่จุดรับสินค้า' },
  ];

  validate(): boolean {
    const errs: Record<string, string> = {};
    if (!this.address().trim()) errs['address'] = 'กรุณากรอกที่อยู่จัดส่ง';
    else if (this.address().trim().length < 10) errs['address'] = 'กรุณากรอกที่อยู่ให้ครบถ้วน (อย่างน้อย 10 ตัวอักษร)';
    if (!this.phone().trim()) errs['phone'] = 'กรุณากรอกเบอร์โทรศัพท์';
    else if (!/^[0-9]{9,10}$/.test(this.phone().trim())) errs['phone'] = 'เบอร์โทรศัพท์ไม่ถูกต้อง (9-10 หลัก)';
    this.errors.set(errs);
    return Object.keys(errs).length === 0;
  }

  placeOrder() {
    if (!this.validate()) return;
    const addr = this.address().trim();
    const ph = this.phone().trim();
    
    // Save to prefs for next time
    this.saveToPrefs(addr, ph);

    const order = this.cartSvc.placeOrder(
      addr,
      ph,
      this.paymentMethod(),
      this.note().trim() || undefined
    );
    this.orderId.set(order.id);
    this.submitted.set(true);
  }

  goToOrders() {
    this.router.navigate(['/shop/orders']);
  }

  goToShop() {
    this.router.navigate(['/shop']);
  }

  goToCart() {
    this.router.navigate(['/shop/cart']);
  }
}
