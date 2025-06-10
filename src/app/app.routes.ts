import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { TextAnalyzerComponent } from './text-analyzer/text-analyzer.component';

export const routes: Routes = [
    { path: '', component: AppComponent },  // homepage
    { path: 'analyze', component: TextAnalyzerComponent }
];
