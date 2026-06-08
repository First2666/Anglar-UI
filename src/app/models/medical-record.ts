export type MedicalRecord = {
    id: string;
    petId: string;
    ownerId: string;
    appointmentId?: string;
    vetId?: string;
    date: string; // ISO date (yyyy-mm-dd)
    
    // SOAP Format
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;

    // Computed / specific vitals
    weight?: number; // kg
    temperature?: number; // Celsius
    heartRate?: number; // bpm
    respiratoryRate?: number; // breaths per min

    createdAt: string; // ISO
};
