// src/app/core/http/http-error.interceptor.ts

import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { AppError, ErrorCode, HTTP_STATUS } from '@core/models';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY_MS = 1000;

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      retry({
        count: this.MAX_RETRIES,
        delay: (error: HttpErrorResponse, retryCount: number) => {
          if (error.status === 0 || error.status >= 500) {
            console.log(`Retry attempt ${retryCount} for ${req.url}`);
            return timer(this.RETRY_DELAY_MS * retryCount);
          }
          throw error;
        },
      }),
      catchError((error: HttpErrorResponse) => {
        const appError = this.handleError(error, req.url);
        this.logError(appError, req);
        return throwError(() => appError);
      })
    );
  }

  private handleError(error: HttpErrorResponse, url: string): AppError {
    if (error.status === 0) {
      return new AppError(
        'No se pudo conectar al servidor. Verifica tu conexión a internet.',
        ErrorCode.NETWORK_ERROR,
        0,
        { url, originalError: error.message }
      );
    }

    if (error.status === HTTP_STATUS.TIMEOUT) {
      return new AppError(
        'La petición tardó demasiado. Intenta de nuevo.',
        ErrorCode.TIMEOUT_ERROR,
        HTTP_STATUS.TIMEOUT,
        { url }
      );
    }

    if (error.status >= 500) {
      return new AppError(
        'Error en el servidor. Estamos trabajando para solucionarlo.',
        ErrorCode.SERVER_ERROR,
        error.status,
        { url, serverMessage: error.message }
      );
    }

    switch (error.status) {
      case HTTP_STATUS.UNAUTHORIZED:
        return new AppError(
          'No estás autenticado. Inicia sesión nuevamente.',
          ErrorCode.UNAUTHORIZED,
          HTTP_STATUS.UNAUTHORIZED,
          { url }
        );

      case HTTP_STATUS.FORBIDDEN:
        return new AppError(
          'No tienes permisos para acceder a este recurso.',
          ErrorCode.FORBIDDEN,
          HTTP_STATUS.FORBIDDEN,
          { url }
        );

      case HTTP_STATUS.NOT_FOUND:
        return new AppError(
          'El recurso solicitado no existe.',
          ErrorCode.NOT_FOUND,
          HTTP_STATUS.NOT_FOUND,
          { url }
        );

      case HTTP_STATUS.BAD_REQUEST: {
        const backendMessage = this.extractBackendMessage(error);
        return new AppError(
          backendMessage || 'Datos inválidos en la petición.',
          ErrorCode.VALIDATION_ERROR,
          HTTP_STATUS.BAD_REQUEST,
          { url, validationErrors: error.error }
        );
      }

      default:
        return new AppError(
          'Ocurrió un error inesperado.',
          ErrorCode.UNKNOWN_ERROR,
          error.status,
          { url, error: error.message }
        );
    }
  }

  private extractBackendMessage(error: HttpErrorResponse): string | null {
    if (typeof error.error === 'string') {
      return error.error;
    }
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.error?.error?.message) {
      return error.error.error.message;
    }
    return null;
  }

  private logError(error: AppError, req: HttpRequest<unknown>): void {
    const errorLog = {
      timestamp: new Date().toISOString(),
      errorCode: error.code,
      message: error.message,
      statusCode: error.statusCode,
      url: req.url,
      method: req.method,
      details: error.details,
    };

    console.error('HTTP Error:', errorLog);
  }
}