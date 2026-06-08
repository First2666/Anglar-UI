import { Injectable, computed } from '@angular/core';
import { Product } from '../models/product';
import { SAMPLE_PRODUCTS } from './products.data';
import { createStoredSignal } from './storage';

@Injectable({
  providedIn: 'root'
})
export class Products {
  private readonly store = createStoredSignal<Product[]>('petClinic.products', []);

  readonly products = computed(() => this.store.state());

  constructor() {
    this.ensureSeed();
  }

  ensureSeed() {
    if (this.store.state().length > 0) return;
    this.store.persist([...SAMPLE_PRODUCTS]);
  }

  getById(id: string) {
    return this.store.state().find(p => p.id === id);
  }

  persist(items: Product[]) {
    this.store.persist(items);
  }

  update(id: string, updates: Partial<Product>) {
    const next = this.store.state().map(p => p.id === id ? { ...p, ...updates } : p);
    this.store.persist(next);
  }

  add(product: Product) {
    this.store.persist([product, ...this.store.state()]);
  }

  remove(id: string) {
    this.store.persist(this.store.state().filter(p => p.id !== id));
  }
}
