import { InjectionToken } from '@angular/core';

export interface AppEnvironmentConfig {
  dogApiUrl: string;
  catFactsApiUrl: string;
}

/**
 * Section 10 - Angular Tokens
 * ใช้ InjectionToken เพื่อสร้างที่เก็บข้อมูลคอนฟิกชันระดับโปรเจ็ค
 * นำส่ง URL หรือตัวแปรอื่นๆ ผ่าน Dependency Injection เพื่อความปลอดภัยและสะดวกต่อการทดสอบ
 */
export const APP_ENV_CONFIG = new InjectionToken<AppEnvironmentConfig>('APP_ENV_CONFIG');

// ค่าคงที่เริ่มต้นที่นำไป Provide ให้แอป
export const defaultAppConfig: AppEnvironmentConfig = {
  dogApiUrl: 'https://dog.ceo/api',
  catFactsApiUrl: 'https://catfact.ninja'
};
