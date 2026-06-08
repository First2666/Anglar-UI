import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { APP_ENV_CONFIG, defaultAppConfig } from './app.tokens';

/**
 * Section 18 – Handling HTTP Calls with Angular
 * เพิ่ม provideHttpClient(withFetch()) เพื่อให้ HttpClient ใช้งานได้ทั่วทั้งแอป
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    provideRouter(routes),
    provideHttpClient(withFetch()),  // Section 18: enable HttpClient
    // Section 10: Angular Tokens - Provide ค่าคอนฟิกเริ่มต้นให้แอปพลิเคชัน
    { provide: APP_ENV_CONFIG, useValue: defaultAppConfig }
  ]
};
