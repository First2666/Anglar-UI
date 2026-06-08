export type ProductCategory =
  | 'อาหารสุนัข'
  | 'อาหารแมว'
  | 'อาหารนก'
  | 'อาหารกระต่าย'
  | 'ของเล่น'
  | 'อุปกรณ์ดูแล'
  | 'วิตามิน/ยา'
  | 'อื่นๆ';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  imageUrl?: string;     // Product image URL
  icon?: string;         // Deprecated: Material Icon name
  iconColor?: string;    // Deprecated: optional accent color
  stock: number;
  unit: string;
  brand?: string;
  forSpecies?: string[];
  rating: number;
  reviewCount: number;
}


export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'packing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  items: CartItem[];
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;  // ISO
  address: string;
  contactPhone: string;
  note?: string;
  paymentMethod: 'cash' | 'transfer' | 'cod';
}
