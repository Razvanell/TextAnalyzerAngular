import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextAnalyzerService, AnalysisResult } from './text-analyzer.service';
import { AnalysisType } from './analysis-type.enum';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

interface PreviousAnalysis {
  text: string;
  type: AnalysisType;
  mode: 'Online' | 'Offline';
  result: AnalysisResult | string;
}

@Component({
  selector: 'app-text-analyzer',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe],
  templateUrl: './text-analyzer.component.html',
  styleUrls: ['./text-analyzer.component.css'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class TextAnalyzerComponent {

  private readonly COMPONENT_NAME = '[TextAnalyzerComponent]';
  // Log methods for consistent logging format
  private log(method: string, message: string, ...args: any[]): void {
    console.info(`${this.COMPONENT_NAME}[${method}] ${message}`, ...args);
  }

  private errorLog(method: string, message: string, ...args: any[]): void {
    console.error(`${this.COMPONENT_NAME}[${method}] ${message}`, ...args);
  }

  // Component properties
  inputText: string = '';
  analysisType: AnalysisType = AnalysisType.VOWELS; // Default to VOWELS
  isOnline: boolean = false;
  isLoading: boolean = false;
  previousAnalyses: PreviousAnalysis[] = [];
  errorMessage: string | null = null;

  public readonly AnalysisType = AnalysisType;
  public readonly analysisTypes = Object.values(AnalysisType);

  constructor(private textAnalyzerService: TextAnalyzerService) { }

  analyzeText(): void {
    const methodName = 'analyzeText';
    this.errorMessage = null;

    if (!this.inputText || this.inputText.trim() === '') {
      this.errorMessage = 'Please enter text to analyze.';
      this.log(methodName, 'Client-side validation: Input text is empty. Request aborted.');
      return;
    }

    const currentAnalysis: PreviousAnalysis = {
      text: this.inputText,
      type: this.analysisType,
      mode: this.isOnline ? 'Online' : 'Offline',
      result: {},
    };

    if (this.isOnline) {
      this.isLoading = true;
      this.log(methodName, `Initiating online analysis request for type: ${this.analysisType}`);

      this.textAnalyzerService.analyzeOnline(this.inputText, this.analysisType)
        .pipe(
          catchError((error) => {
            this.errorLog(methodName, 'Online analysis request failed. Error:', error);
            const backendErrorMessage = error.error?.message || 'Failed to connect to backend. Please ensure the server is running or check network.';
            this.errorMessage = `Error: ${backendErrorMessage}`;
            currentAnalysis.result = `Error: ${this.errorMessage}`;
            this.previousAnalyses.unshift(currentAnalysis);
            return of({});
          }),
          finalize(() => {
            this.isLoading = false;
            this.log(methodName, `Online analysis request finalized. isLoading set to: ${this.isLoading}`);
          })
        )
        .subscribe({
          next: (result) => {
            if (!this.errorMessage) { // Ensure no prior error from catchError
              currentAnalysis.result = result;
              this.previousAnalyses.unshift(currentAnalysis);
              this.log(methodName, 'Online analysis request successful. Result received:', result);
            }
          }
        });
    } else {
      this.log(methodName, 'Performing offline analysis.');
      currentAnalysis.result = this.textAnalyzerService.analyzeOffline(this.inputText, this.analysisType);
      this.previousAnalyses.unshift(currentAnalysis);
      this.log(methodName, 'Offline analysis completed.');
    }
  }

  isErrorResult(result: AnalysisResult | string): boolean {
    return typeof result === 'string' && result.startsWith('Error:');
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
}