/**
 * Section 15 – Lazy Loading
 * ทุก route ที่ต้อง auth ใช้ loadComponent() เพื่อ lazy-load
 * Login ยังคง eager load เพราะเป็น entry point
 */
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  // Login: eager load (entry point)
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
    title: 'เข้าสู่ระบบ – Pet Clinic',
  },
  // Register: public
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.Register),
    title: 'สมัครสมาชิก – Pet Clinic',
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/landing/landing').then(m => m.Landing),
    title: 'หน้าแรก – Pet Clinic',
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
        title: 'Dashboard – Pet Clinic',
      },
      {
        path: 'pets',
        loadComponent: () => import('./pages/pets/pets').then(m => m.Pets),
        title: 'Pets – Pet Clinic',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'vet', 'owner'] },
      },
      {
        path: 'appointments',
        loadComponent: () => import('./pages/appointments/appointments').then(m => m.Appointments),
        title: 'Appointments – Pet Clinic',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'vet', 'owner'] },
      },
      {
        path: 'vets',
        loadComponent: () => import('./pages/vets/vets').then(m => m.Vets),
        title: 'Veterinarians – Pet Clinic',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users').then(m => m.Users),
        title: 'จัดการผู้ใช้ – Pet Clinic',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'medical-records',
        loadComponent: () => import('./pages/medical-records/medical-records').then(m => m.MedicalRecordsPage),
        title: 'Medical Records – Pet Clinic',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'vet'] },
      },
      {
        path: 'treatment/:apptId',
        loadComponent: () => import('./pages/treatment/treatment').then(m => m.TreatmentComponent),
        title: 'ห้องรักษา – Pet Clinic',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'vet'] },
      },
      {
        path: 'my-appointments',
        loadComponent: () => import('./pages/my-appointments/my-appointments').then(m => m.MyAppointments),
        title: 'ประวัติการนัดหมาย – Pet Clinic',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'vet', 'owner'] },
      },
      {
        path: 'my-treatment-history',
        loadComponent: () => import('./pages/my-treatment-history/my-treatment-history').then(m => m.MyTreatmentHistory),
        title: 'ประวัติการรักษา – Pet Clinic',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'vet', 'owner'] },
      },
      {
        path: 'calendar',
        loadComponent: () => import('./pages/calendar/calendar').then(m => m.Calendar),
        title: 'Calendar – Pet Clinic',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'vet'] },
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/reports/reports').then(m => m.Reports),
        title: 'Reports – Pet Clinic',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile').then(m => m.Profile),
        title: 'โปรไฟล์ – Pet Clinic',
      },
      // ── ร้านค้าสัตว์เลี้ยง ──
      {
        path: 'shop',
        loadComponent: () => import('./pages/shop/shop').then(m => m.Shop),
        title: 'ร้านค้า – Pet Clinic',
      },
      {
        path: 'shop/cart',
        loadComponent: () => import('./pages/cart/cart').then(m => m.Cart),
        title: 'ตะกร้าสินค้า – Pet Clinic',
      },
      {
        path: 'shop/checkout',
        loadComponent: () => import('./pages/checkout/checkout').then(m => m.Checkout),
        title: 'ชำระเงิน – Pet Clinic',
      },
      {
        path: 'shop/orders',
        loadComponent: () => import('./pages/orders/orders').then(m => m.Orders),
        title: 'ประวัติการสั่งซื้อ – Pet Clinic',
      },
      {
        path: 'boarding',
        loadComponent: () => import('./pages/boarding/boarding').then(m => m.Boarding),
        title: 'ฝากเลี้ยง – Pet Clinic',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'vet', 'owner'] },
      },
      {
        path: 'bills',
        loadComponent: () => import('./pages/bills/bills').then(m => m.Bills),
        title: 'ค่าใช้จ่าย – Pet Clinic',
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
