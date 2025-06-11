import { Routes } from '@angular/router';
import { TextAnalyzerComponent } from './text-analyzer/text-analyzer.component';
import { MaterialAnalyzerComponent } from './material-analyzer/material-analyzer.component';

export const routes: Routes = [
  // Default route: redirects to '/analyze'
  // pathMatch: 'full' ensures it only redirects if the entire URL path is empty.
  { path: '', redirectTo: 'analyze', pathMatch: 'full' },

  // Route for the default text analyzer
  { path: 'analyze', component: TextAnalyzerComponent },

  // Route for the Angular Material version of the analyzer
  { path: 'material-analyze', component: MaterialAnalyzerComponent },

];