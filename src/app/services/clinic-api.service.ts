import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap, retry } from 'rxjs/operators';
import { APP_ENV_CONFIG } from '../app.tokens';

/**
 * Section 18 – Handling HTTP Calls with Angular
 * ClinicApiService ใช้ HttpClient เรียก public Dog API
 * เพื่อดึงสายพันธุ์สุนัขมาใช้เป็น breed suggestions ในฟอร์มเพิ่มสัตว์เลี้ยง
 *
 * API: https://dog.ceo/api/breeds/list/all (free, no auth required)
 */
@Injectable({ providedIn: 'root' })
export class ClinicApiService {
  private readonly http = inject(HttpClient);

  // Section 10 - Angular Tokens (ใช้งาน Token แทนการฮาร์ดโค้ด URL)
  private readonly envConfig = inject(APP_ENV_CONFIG);

  // Signals เก็บ state ของ HTTP result
  readonly dogBreeds = signal<string[]>([]);
  readonly catFact = signal<string>('');
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * ดึงรายชื่อสายพันธุ์สุนัขทั้งหมด
   * Section 18: GET request ด้วย HttpClient
   * Section 17: .pipe() ด้วย map, catchError, retry, tap
   */
  fetchDogBreeds(): Observable<string[]> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.get<{ message: Record<string, string[]>; status: string }>(
      `${this.envConfig.dogApiUrl}/breeds/list/all`
    ).pipe(
      retry(2),                                  // retry 2 ครั้งถ้า fail
      map(res => Object.keys(res.message)),      // แปลง object → array ชื่อสายพันธุ์
      map(breeds => breeds.map(b =>              // Capitalize แต่ละชื่อ
        b.charAt(0).toUpperCase() + b.slice(1)
      )),
      tap(breeds => {
        this.dogBreeds.set(breeds);
        this.isLoading.set(false);
      }),
      catchError((err: HttpErrorResponse) => {
        const msg = err.message || 'ไม่สามารถดึงข้อมูลสายพันธุ์ได้';
        this.error.set(msg);
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * ดึง Cat Fact แบบสุ่ม
   * Section 18: GET request พร้อม query params
   */
  fetchCatFact(): Observable<string> {
    return this.http.get<{ fact: string; length: number }>(
      `${this.envConfig.catFactsApiUrl}/fact`,
      { params: { max_length: '100' } }
    ).pipe(
      map(res => res.fact),
      tap(fact => this.catFact.set(fact)),
      catchError(() => of('แมวนอนหลับ 12-16 ชั่วโมงต่อวัน'))
    );
  }

  /** ค้นหา breed จาก local cache (ไม่ต้องเรียก API ซ้ำ) */
  searchBreeds(term: string): string[] {
    if (!term) return this.dogBreeds().slice(0, 10);
    const q = term.toLowerCase();
    return this.dogBreeds().filter(b => b.toLowerCase().includes(q)).slice(0, 10);
  }
}
