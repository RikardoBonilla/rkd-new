import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment'; 
import { AppError, ErrorCode } from '../models/error.model';

/**
 * Query Parameters type-safe
 */
export type QueryParams = Record<string, string | number | boolean | undefined>;

/**
 * API Service Base
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  protected readonly baseUrl = environment.apiUrl;
  protected readonly timeout = environment.apiTimeout;

  constructor(protected http: HttpClient) {}

  
  protected get<T>(endpoint: string, params?: QueryParams): Observable<T> {
    return this.http
      .get<T>(`${this.baseUrl}${endpoint}`, {
        params: this.buildParams(params),
        headers: this.getHeaders(),
      })
      .pipe(
        timeout(this.timeout),
        catchError((error) => this.handleError(error))
      );
  }

  
  protected post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http
      .post<T>(`${this.baseUrl}${endpoint}`, body, {
        headers: this.getHeaders(),
      })
      .pipe(
        timeout(this.timeout),
        catchError((error) => this.handleError(error))
      );
  }

  
  protected put<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http
      .put<T>(`${this.baseUrl}${endpoint}`, body, {
        headers: this.getHeaders(),
      })
      .pipe(
        timeout(this.timeout),
        catchError((error) => this.handleError(error))
      );
  }

  protected delete<T>(endpoint: string): Observable<T> {
    return this.http
      .delete<T>(`${this.baseUrl}${endpoint}`, {
        headers: this.getHeaders(),
      })
      .pipe(
        timeout(this.timeout),
        catchError((error) => this.handleError(error))
      );
  }

  protected patch<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http
      .patch<T>(`${this.baseUrl}${endpoint}`, body, {
        headers: this.getHeaders(),
      })
      .pipe(
        timeout(this.timeout),
        catchError((error) => this.handleError(error))
      );
  }

  protected getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
  }

  
  private buildParams(params?: QueryParams): HttpParams {
    if (!params) {
      return new HttpParams();
    }

    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return httpParams;
  }

    
  private handleError(error: unknown): Observable<never> {
    if (error instanceof AppError) {
      return throwError(() => error);
    }

    const appError = new AppError(
      'Error inesperado en la petición',
      ErrorCode.UNKNOWN_ERROR,
      undefined,
      { originalError: error }
    );

    return throwError(() => appError);
  }
}