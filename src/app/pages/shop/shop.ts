import {
  Component, computed, effect, inject, signal, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Products } from '../../data/products';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { Product, ProductCategory } from '../../models/product';
import { ProductEditDialog } from './product-edit-dialog/product-edit-dialog';
import { ConfirmDialogComponent } from '../../components/shared/confirm-dialog/confirm-dialog';

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'rating';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatInputModule,
    MatFormFieldModule,
    MatBadgeModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatSelectModule,
    MatDialogModule,
  ],
  templateUrl: './shop.html',
  styleUrl: './shop.scss',
})
export class Shop implements OnInit {
  private readonly cart = inject(CartService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly productsStore = inject(Products);

  readonly products = this.productsStore.products;
  readonly cartCount = this.cart.totalItems;
  readonly isAdmin = computed(() => this.auth.role === 'admin');

  searchTerm = signal('');
  selectedCategory = signal<ProductCategory | 'ทั้งหมด'>('ทั้งหมด');
  sortBy = signal<SortOption>('default');
  selectedProduct = signal<Product | null>(null);
  selectedQty = signal(1);
  addedToCartIds = signal<Set<string>>(new Set());

  // Pagination
  currentPage = signal(0);
  pageSize = signal(8);
  
  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredProducts().length / this.pageSize());
  });

  readonly paginatedProducts = computed(() => {
    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredProducts().slice(start, end);
  });

  readonly pageNumbers = computed(() => {
    return Array.from({ length: this.totalPages() }, (_, i) => i);
  });

  readonly categories: ('ทั้งหมด' | ProductCategory)[] = [
    'ทั้งหมด',
    'อาหารสุนัข',
    'อาหารแมว',
    'อาหารนก',
    'อาหารกระต่าย',
    'ของเล่น',
    'อุปกรณ์ดูแล',
    'วิตามิน/ยา',
  ];

  readonly filteredProducts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const cat = this.selectedCategory();
    const sort = this.sortBy();

    let result = this.products().filter(p => {
      const matchSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        (p.brand?.toLowerCase().includes(term) ?? false);
      const matchCat = cat === 'ทั้งหมด' || p.category === cat;
      return matchSearch && matchCat;
    });

    if (sort === 'price-asc') result = [...result].sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') result = [...result].sort((a, b) => b.price - a.price);
    else if (sort === 'rating') result = [...result].sort((a, b) => b.rating - a.rating);

    return result;
  });

  constructor() {
    // Reset to first page when filters or search terms change
    effect(() => {
      this.searchTerm();
      this.selectedCategory();
      this.sortBy();
      this.currentPage.set(0);
    }, { allowSignalWrites: true });
  }

  ngOnInit() {}

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage() {
    this.goToPage(this.currentPage() + 1);
  }

  prevPage() {
    this.goToPage(this.currentPage() - 1);
  }

  selectCategory(cat: 'ทั้งหมด' | ProductCategory) {
    this.selectedCategory.set(cat);
  }

  openProduct(p: Product) {
    this.selectedProduct.set(p);
    this.selectedQty.set(1);
  }

  closeDetail() {
    this.selectedProduct.set(null);
  }

  incrementQty() {
    const p = this.selectedProduct();
    if (p && this.selectedQty() < p.stock) {
      this.selectedQty.update(v => v + 1);
    }
  }

  decrementQty() {
    if (this.selectedQty() > 1) {
      this.selectedQty.update(v => v - 1);
    }
  }

  updateStock(amount: number) {
    const p = this.selectedProduct();
    if (!p) return;
    const newStock = Math.max(0, p.stock + amount);
    this.productsStore.update(p.id, { stock: newStock });
    
    // Update local selected product to reflect change immediately in UI
    this.selectedProduct.update(curr => curr ? { ...curr, stock: newStock } : null);
    
    // Adjust selectedQty if it exceeds new stock
    if (this.selectedQty() > newStock) {
        this.selectedQty.set(newStock === 0 ? 1 : newStock);
    }
  }

  addToCart(product: Product, qty = 1) {
    if (product.stock <= 0) return;
    this.cart.addToCart(product, qty);

    // visual feedback
    const ids = new Set(this.addedToCartIds());
    ids.add(product.id);
    this.addedToCartIds.set(ids);
    setTimeout(() => {
      const updated = new Set(this.addedToCartIds());
      updated.delete(product.id);
      this.addedToCartIds.set(updated);
    }, 1200);

    this.snackBar.open(`เพิ่ม "${product.name}" ลงตะกร้าแล้ว 🛒`, 'ตกลง', {
      duration: 2500,
      panelClass: ['snack-success'],
    });
  }

  goToCart() {
    this.router.navigate(['/shop/cart']);
  }

  getStars(rating: number): string[] {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return [
      ...Array(full).fill('star'),
      ...(half ? ['star_half'] : []),
      ...Array(empty).fill('star_border'),
    ];
  }

  stockClass(stock: number): string {
    if (stock <= 0) return 'out-of-stock';
    if (stock <= 10) return 'low-stock';
    return 'in-stock';
  }

  stockLabel(stock: number): string {
    if (stock <= 0) return 'สินค้าหมด';
    if (stock <= 10) return `เหลือ ${stock} ${this.selectedProduct()?.unit ?? 'ชิ้น'}`;
    return 'มีสินค้า';
  }

  isAdded(productId: string): boolean {
    return this.addedToCartIds().has(productId);
  }

  // --- Admin CRUD ---

  addProduct() {
    const dialogRef = this.dialog.open(ProductEditDialog, {
      width: 'auto',
      maxWidth: '95vw',
      panelClass: 'minimal-dialog',
    });

    dialogRef.afterClosed().subscribe((res: Product) => {
      if (res) {
        const newProduct: Product = {
          ...res,
          id: 'p' + (Math.floor(Math.random() * 9000) + 1000),
          rating: 0,
          reviewCount: 0,
        };
        this.productsStore.add(newProduct);
        this.snackBar.open(`เพิ่มสินค้า "${res.name}" เรียบร้อยแล้ว`, 'ตกลง', { duration: 3000 });
      }
    });
  }

  editProduct(p: Product, event: Event) {
    event.stopPropagation();
    const dialogRef = this.dialog.open(ProductEditDialog, {
      width: 'auto',
      maxWidth: '95vw',
      panelClass: 'minimal-dialog',
      data: { product: p },
    });

    dialogRef.afterClosed().subscribe((res: Product) => {
      if (res) {
        this.productsStore.update(p.id, res);
        this.snackBar.open(`อัปเดตข้อมูล "${res.name}" เรียบร้อยแล้ว`, 'ตกลง', { duration: 3000 });
      }
    });
  }

  deleteProduct(p: Product, event: Event) {
    event.stopPropagation();
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'ยืนยันการลบสินค้า',
        message: `คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า "${p.name}"?`,
        confirmText: 'ลบสินค้า',
        icon: 'delete_forever',
        iconColor: '#f44336'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.productsStore.remove(p.id);
        this.snackBar.open(`ลบสินค้า "${p.name}" เรียบร้อยแล้ว`, 'ตกลง', { duration: 3000 });
      }
    });
  }
}
