import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextAnalyzerService, AnalysisResult } from './text-analyzer.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface PreviousAnalysis {
  text: string;
  type: 'vowels' | 'consonants';
  mode: 'Online' | 'Offline';
  result: AnalysisResult | string;
}

@Component({
  selector: 'app-text-analyzer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './text-analyzer.component.html',
  styleUrls: ['./text-analyzer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextAnalyzerComponent {
  inputText: string = '';
  analysisType: 'vowels' | 'consonants' = 'vowels';
  isOnline: boolean = false;
  previousAnalyses: PreviousAnalysis[] = [];
  errorMessage: string | null = null;

  constructor(private textAnalyzerService: TextAnalyzerService) {}

  analyzeText(): void {
    this.errorMessage = null;
    const currentAnalysis: PreviousAnalysis = {
      text: this.inputText,
      type: this.analysisType,
      mode: this.isOnline ? 'Online' : 'Offline',
      result: {},
    };

    if (this.isOnline) {
      this.textAnalyzerService.analyzeOnline(this.inputText, this.analysisType)
        .pipe(
          catchError((error) => {
            console.error('Error during online analysis:', error);
            this.errorMessage = 'Failed to connect to backend. Please ensure the backend server is running.';
            currentAnalysis.result = `Error: ${this.errorMessage}`;
            this.previousAnalyses.unshift(currentAnalysis);
            return of({});
          })
        )
        .subscribe((result) => {
          if (!this.errorMessage) {
            currentAnalysis.result = result;
            this.previousAnalyses.unshift(currentAnalysis);
          }
        });
    } else {
      currentAnalysis.result = this.textAnalyzerService.analyzeOffline(this.inputText, this.analysisType);
      this.previousAnalyses.unshift(currentAnalysis);
    }
  }

  formatResult(result: AnalysisResult | string): string {
    if (typeof result === 'string') {
      return result;
    }
    if (Object.keys(result).length === 0) {
      return 'No relevant characters found or empty input.';
    }
    return Object.entries(result)
      .map(([char, count]) => `Letter '${char}' appears ${count} times`)
      .join('<br>');
  }

  // >>> ADD THIS NEW HELPER METHOD <<<
  isErrorResult(result: AnalysisResult | string): boolean {
    return typeof result === 'string' && result.startsWith('Error:');
  }
}