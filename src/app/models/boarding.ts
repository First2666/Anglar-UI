export type BoardingStatus = 'Confirmed' | 'CheckedIn' | 'CheckedOut' | 'Cancelled';
export type RoomType = 'Standard' | 'Deluxe' | 'VIP';

export interface BoardingStay {
  id: string;
  petId: string;
  ownerId: string;
  roomType: RoomType;
  roomNumber: string;
  checkInDate: string;  // ISO Date string
  checkOutDate: string; // ISO Date string
  status: BoardingStatus;
  notes?: string;
  dailyRate: number;
  totalAmount: number;
}

export interface BoardingRoom {
  roomNumber: string;
  type: RoomType;
  isAvailable: boolean;
  pricePerNight: number;
  imageUrls?: string[];
}
