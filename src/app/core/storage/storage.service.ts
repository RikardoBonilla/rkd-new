// src/app/core/storage/storage.service.ts

import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { from, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  set<T>(key: string, value: T): Observable<void> {
    return from(
      Preferences.set({
        key,
        value: JSON.stringify(value),
      })
    ).pipe(
      map(() => void 0),
      catchError((error: unknown) => {
        console.error(`Error saving to storage [${key}]:`, error);
        return of(void 0);
      })
    );
  }

  get<T>(key: string): Observable<T | null> {
    return from(Preferences.get({ key })).pipe(
      map((result) => {
        if (!result.value) {
          return null;
        }
        try {
          return JSON.parse(result.value) as T;
        } catch (error: unknown) {
          console.error(`Error parsing storage data [${key}]:`, error);
          return null;
        }
      }),
      catchError((error: unknown) => {
        console.error(`Error reading from storage [${key}]:`, error);
        return of(null);
      })
    );
  }

  remove(key: string): Observable<void> {
    return from(Preferences.remove({ key })).pipe(
      map(() => void 0),
      catchError((error: unknown) => {
        console.error(`Error removing from storage [${key}]:`, error);
        return of(void 0);
      })
    );
  }

  clear(): Observable<void> {
    return from(Preferences.clear()).pipe(
      map(() => void 0),
      catchError((error: unknown) => {
        console.error('Error clearing storage:', error);
        return of(void 0);
      })
    );
  }

  has(key: string): Observable<boolean> {
    return this.get(key).pipe(map((value) => value !== null));
  }

  setWithExpiry<T>(key: string, value: T, ttlMs: number): Observable<void> {
    const item = {
      value,
      expiry: Date.now() + ttlMs,
    };
    return this.set(key, item);
  }

  getWithExpiry<T>(key: string): Observable<T | null> {
    return this.get<{ value: T; expiry: number }>(key).pipe(
      map((item) => {
        if (!item) {
          return null;
        }
        if (Date.now() > item.expiry) {
          this.remove(key).subscribe();
          return null;
        }
        return item.value;
      })
    );
  }
}