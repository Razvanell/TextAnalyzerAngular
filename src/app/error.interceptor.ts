import { Injectable, Injector } from '@angular/core'; // Import Injector
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AnalysisStateManager } from './core/analysis-state.service';

/**
 * Intercepts HTTP errors to display user-friendly messages.
 */
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  // Inject the Angular Injector, not AnalysisStateManager directly
  constructor(private injector: Injector) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Lazily get the AnalysisStateManager instance. This prevents circular dependency issues if an http request is made.
    // This ensures AnalysisStateManager is fully initialized when it's requested
    const analysisStateManager = this.injector.get(AnalysisStateManager);

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('HTTP Interceptor caught error:', error);

        let userFriendlyMessage = 'An unknown network error occurred.';

        if (error.status === 0) {
          userFriendlyMessage = 'Could not connect to the server. Please check your internet connection.';
        } else if (error.status >= 400 && error.status < 500) {
          userFriendlyMessage = error.error?.message || `Request failed with status ${error.status}. Invalid input or resource not found.`;
        } else if (error.status >= 500 && error.status < 600) {
          userFriendlyMessage = 'Server error: Something went wrong on our end. Please try again later.';
        } else {
          userFriendlyMessage = `An unexpected HTTP error occurred (Status: ${error.status}).`;
        }

        // Set the user-facing error message using the lazily-loaded state manager
        analysisStateManager.setErrorMessage(userFriendlyMessage);

        // Re-throw the error
        return throwError(() => error);
      })
    );
  }
}