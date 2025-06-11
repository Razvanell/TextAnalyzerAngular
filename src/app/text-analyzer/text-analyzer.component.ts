import { Component, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextAnalyzerService, AnalysisResult } from './text-analyzer.service';
import { AnalysisType } from './analysis-type.enum';
import { catchError, finalize, delay } from 'rxjs/operators';
import { of, timer, forkJoin, Observable, Subscription } from 'rxjs';
import { AnalysisHistoryService } from './analysis-history.service';
import { AnalysisStateManager } from './analysis-state.service';

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
export class TextAnalyzerComponent implements AfterViewInit, OnDestroy {

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

  public readonly AnalysisType = AnalysisType;
  public readonly analysisTypes = Object.values(AnalysisType);
  public readonly maxInputLength: number = 250;

  private readonly MIN_LOADING_DURATION_MS = 1000;
  private subscriptions = new Subscription();

  @ViewChild('textareaElement') textareaElementRef!: ElementRef;

  constructor(
    private textAnalyzerService: TextAnalyzerService,
    public analysisHistoryService: AnalysisHistoryService,
    public analysisStateManager: AnalysisStateManager
  ) { }

  ngAfterViewInit(): void {
    this.adjustTextareaHeight();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
    this.analysisStateManager.clearErrorMessage();

    // Use the state manager's tooltip logic to check validation
    // If there's a tooltip text, it means there's a reason to disable the button. Stop the analysis and set the error message if applicable.
    const tooltipReason = this.analysisStateManager.getAnalysisButtonTooltipText(
        this.inputText,
        this.analysisType,
        this.isOnline,
        this.maxInputLength
    );

    if (tooltipReason === 'Input cannot be empty.' || tooltipReason.startsWith('Input exceeds')) {
        this.analysisStateManager.setErrorMessage(tooltipReason);
        this.log(methodName, `Client-side validation failed: ${tooltipReason}. Request aborted.`);
        return;
    }
    // If the tooltip reason is 'This analysis has already been performed successfully.',
    // it means we found an existing analysis, so we can just return.
    if (tooltipReason === 'This analysis has already been performed successfully.') {
        this.log(methodName, 'Found existing SUCCESSFUL analysis in history. No new analysis needed.');
        this.analysisStateManager.setLoading(false); // Ensure loading is off
        return;
    }

    const mode = this.isOnline ? 'Online' : 'Offline';

    this.startAnalysisProcess(methodName, mode);
  }

  private startAnalysisProcess(methodName: string, mode: 'Online' | 'Offline'): void {
    this.analysisStateManager.setLoading(true);
    const currentAnalysis: PreviousAnalysis = {
      text: this.inputText,
      type: this.analysisType,
      mode: mode,
      result: {},
      timestamp: new Date()
    };

    if (this.isOnline) {
      this.performOnlineAnalysis(currentAnalysis, methodName);
    } else {
      this.performOfflineAnalysis(currentAnalysis, methodName);
    }
  }

  private performOnlineAnalysis(currentAnalysis: PreviousAnalysis, methodName: string): void {
    this.log(methodName, `Initiating online analysis request for type: ${this.analysisType}`);

    const analysisRequest$ = this.textAnalyzerService.analyzeOnline(this.inputText, this.analysisType)
      .pipe(
        catchError((error) => {
          this.errorLog(methodName, 'Online analysis request failed. Error:', error);
          const backendErrorMessage = error.error?.message || 'Server or internet connection unavailable.';
          this.analysisStateManager.setErrorMessage(`${backendErrorMessage}`);
          currentAnalysis.result = `Error: ${this.analysisStateManager.errorMessage}`;
          return of(null);
        })
      );

    const subscription = forkJoin([analysisRequest$, timer(this.MIN_LOADING_DURATION_MS)])
      .pipe(
        finalize(() => {
          this.analysisStateManager.setLoading(false);
          this.log(methodName, `Online analysis request finalized. isLoading set to: ${this.analysisStateManager.isLoading}`);
        })
      )
      .subscribe({
        next: ([result, _]) => {
          if (result !== null && !this.analysisStateManager.errorMessage) {
            currentAnalysis.result = result;
            this.log(methodName, 'Online analysis request successful. Result received:', result);
          }
          this.analysisHistoryService.addAnalysis(currentAnalysis);
        },
        error: (err) => {
          this.errorLog(methodName, 'Unexpected error in online analysis subscription:', err);
          this.analysisStateManager.setErrorMessage('An unexpected error occurred during analysis.');
          currentAnalysis.result = `Error: ${this.analysisStateManager.errorMessage}`;
          this.analysisHistoryService.addAnalysis(currentAnalysis);
        }
      });
      this.subscriptions.add(subscription);
  }

  private performOfflineAnalysis(currentAnalysis: PreviousAnalysis, methodName: string): void {
    this.log(methodName, 'Performing offline analysis.');

    const subscription = of(this.textAnalyzerService.analyzeOffline(this.inputText, this.analysisType))
      .pipe(
        delay(this.MIN_LOADING_DURATION_MS),
        finalize(() => {
          this.analysisStateManager.setLoading(false);
          this.log(methodName, 'Offline analysis finalized after minimum duration.');
        })
      )
      .subscribe(result => {
        currentAnalysis.result = result;
        this.analysisHistoryService.addAnalysis(currentAnalysis);
        this.log(methodName, 'Offline analysis completed.');
      });
      this.subscriptions.add(subscription);
  }

}