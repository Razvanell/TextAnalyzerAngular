import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core'; // Add importProvidersFrom
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http'; 
import { FormsModule } from '@angular/forms';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),  //  Used to send HTTP requests, interceptors
    importProvidersFrom(FormsModule)
  ]
};