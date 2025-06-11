import { Component, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextAnalyzerService, AnalysisResult } from './text-analyzer.service';
import { AnalysisType } from './analysis-type.enum';
import { catchError, finalize, delay } from 'rxjs/operators';
import { of, timer, forkJoin } from 'rxjs';

interface PreviousAnalysis {
  text: string;
  type: AnalysisType;
  mode: 'Online' | 'Offline';
  result: AnalysisResult | string;
  timestamp: Date;
}

@Component({
  selector: 'app-text-analyzer',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe],
  templateUrl: './text-analyzer.component.html',
  styleUrls: ['./text-analyzer.component.css'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class TextAnalyzerComponent implements AfterViewInit {

  private readonly COMPONENT_NAME = '[TextAnalyzerComponent]';
  private log(method: string, message: string, ...args: any[]): void {
    console.info(`${this.COMPONENT_NAME}[${method}] ${message}`, ...args);
  }
  private errorLog(method: string, message: string, ...args: any[]): void {
    console.error(`${this.COMPONENT_NAME}[${method}] ${message}`, ...args);
  }

  inputText: string = '';
  analysisType: AnalysisType = AnalysisType.VOWELS;
  isOnline: boolean = false;
  isLoading: boolean = false;
  previousAnalyses: PreviousAnalysis[] = [];
  errorMessage: string | null = null;

  public readonly AnalysisType = AnalysisType;
  public readonly analysisTypes = Object.values(AnalysisType);

  private readonly MIN_LOADING_DURATION_MS = 1000;

  public readonly maxInputLength: number = 250;

  @ViewChild('textareaElement') textareaElementRef!: ElementRef;

  constructor(private textAnalyzerService: TextAnalyzerService) { }

  ngAfterViewInit(): void {
    this.adjustTextareaHeight();
  }

  onTextareaInput(): void {
    this.adjustTextareaHeight();
  }

  private adjustTextareaHeight(): void {
    if (this.textareaElementRef) {
      const textarea = this.textareaElementRef.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }

  analyzeText(): void {
    const methodName = 'analyzeText';
    this.errorMessage = null;

    if (!this.inputText || this.inputText.trim() === '') {
      this.errorMessage = 'Please enter text to analyze.';
      this.log(methodName, 'Client-side validation: Input text is empty. Request aborted.');
      return;
    }

    // FindExistingAnalysis will only return *successful* analyses
    const existingAnalysis = this.findExistingAnalysis(this.inputText, this.analysisType, this.isOnline);

    if (existingAnalysis) {
      this.log(methodName, 'Found existing SUCCESSFUL analysis in history. Bringing it to top.');
      const index = this.previousAnalyses.indexOf(existingAnalysis);
      if (index > -1) {
        this.previousAnalyses.splice(index, 1);
      }
      this.previousAnalyses.unshift(existingAnalysis);
      this.isLoading = false; // Ensure loading is off if we just found an existing one
      return;
    }

    const currentAnalysis: PreviousAnalysis = {
      text: this.inputText,
      type: this.analysisType,
      mode: this.isOnline ? 'Online' : 'Offline',
      result: {}, // Initialize with empty object, will be updated
      timestamp: new Date()
    };

    this.isLoading = true;

    if (this.isOnline) {
      this.log(methodName, `Initiating online analysis request for type: ${this.analysisType}`);

      const analysis$ = this.textAnalyzerService.analyzeOnline(this.inputText, this.analysisType)
        .pipe(
          catchError((error) => {
            this.errorLog(methodName, 'Online analysis request failed. Error:', error);
            const backendErrorMessage = error.error?.message || 'Server or internet connection unavailable.';
            this.errorMessage = `${backendErrorMessage}`; // Set component-level error message
            currentAnalysis.result = `Error: ${this.errorMessage}`; // Store error in analysis result
            return of(null); // Return null to continue the stream without breaking
          })
        );

      const minDelay$ = timer(this.MIN_LOADING_DURATION_MS);

      forkJoin([analysis$, minDelay$])
        .pipe(
          finalize(() => {
            this.isLoading = false;
            this.log(methodName, `Online analysis request finalized. isLoading set to: ${this.isLoading}`);
          })
        )
        .subscribe({
          next: ([result, _]) => {
            // If result is null, it means an error occurred and currentAnalysis.result was already set
            if (result !== null && !this.errorMessage) {
              currentAnalysis.result = result; // Update result for successful analysis
              this.log(methodName, 'Online analysis request successful. Result received:', result);
            }
            // Always add the analysis to history, whether it was successful or an error
            this.previousAnalyses.unshift(currentAnalysis);
          },
          error: (err) => { // This catch is for unexpected errors not handled by catchError in the pipe
            this.errorLog(methodName, 'Unexpected error in online analysis subscription:', err);
            this.errorMessage = 'An unexpected error occurred during analysis.';
            currentAnalysis.result = `Error: ${this.errorMessage}`;
            this.previousAnalyses.unshift(currentAnalysis);
          }
        });
    } else {
      this.log(methodName, 'Performing offline analysis.');

      of(this.textAnalyzerService.analyzeOffline(this.inputText, this.analysisType))
        .pipe(
          delay(this.MIN_LOADING_DURATION_MS),
          finalize(() => {
            this.isLoading = false;
            this.log(methodName, 'Offline analysis finalized after minimum duration.');
          })
        )
        .subscribe(result => {
          currentAnalysis.result = result;
          this.previousAnalyses.unshift(currentAnalysis);
          this.log(methodName, 'Offline analysis completed.');
        });
    }

  }

  // MODIFIED: Only considers an analysis existing if it's NOT an error result.
  public findExistingAnalysis(text: string, type: AnalysisType, isOnline: boolean): PreviousAnalysis | undefined {
    const mode = isOnline ? 'Online' : 'Offline';
    return this.previousAnalyses.find(analysis =>
      analysis.text === text &&
      analysis.type === type &&
      analysis.mode === mode &&
      !this.isErrorResult(analysis.result) // <-- THIS IS THE NEW CONDITION
    );
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

  /**
   * Provides a tooltip message for the analyze button based on its disabled state.
   */
  getButtonTooltipText(): string {
    if (this.isLoading) {
      return 'Analysis in progress...';
    }
    if (!this.inputText || this.inputText.trim() === '') {
      return 'Input cannot be empty.';
    }
    if (this.inputText.length > this.maxInputLength) {
      return `Input exceeds maximum character limit of ${this.maxInputLength}.`;
    }
    // Now, this check will only be true for successful analyses.
    if (this.findExistingAnalysis(this.inputText, this.analysisType, this.isOnline)) {
      return 'This analysis has already been performed successfully.'; // Updated tooltip message
    }
    return '';
  }

}