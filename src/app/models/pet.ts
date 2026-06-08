export type PetSpecies = 'Dog' | 'Cat' | 'Bird' | 'Rabbit' | 'Other';
export type PetSex = 'Male' | 'Female' | 'Unknown';

export type Pet = {
  id: string;
  name: string;
  species: PetSpecies;
  sex: PetSex;
  neutered: boolean;
  microchip?: string;
  breed?: string;
  birthDate?: string; // ISO date (yyyy-mm-dd) optional
  ownerId: string;
  notes?: string;
  photoUrls?: string[];
  createdAt: string; // ISO
};

