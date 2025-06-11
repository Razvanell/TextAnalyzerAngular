import { Component, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit } from '@angular/core'; // Removed OnDestroy
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AnalysisType } from '../core/analysis-type.enum';
import { AnalysisHistoryService } from '../core/analysis-history.service';
import { AnalysisStateManager } from '../core/analysis-state.service';
import { AnalysisWorkflowService } from '../core/analysis-workflow.service';

@Component({
  selector: 'app-text-analyzer',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe],
  templateUrl: './text-analyzer.component.html',
  styleUrls: ['./text-analyzer.component.css'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class TextAnalyzerComponent implements AfterViewInit {

  inputText: string = '';
  analysisType: AnalysisType = AnalysisType.VOWELS;
  isOnline: boolean = false;

  public readonly AnalysisType = AnalysisType;
  public readonly analysisTypes = Object.values(AnalysisType);
  public readonly maxInputLength: number = 250;

  @ViewChild('textareaElement') textareaElementRef!: ElementRef;

  constructor(
    public analysisHistoryService: AnalysisHistoryService,
    public analysisStateManager: AnalysisStateManager,
    private analysisWorkflowService: AnalysisWorkflowService
  ) { }

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
    this.analysisWorkflowService.analyzeText(
      this.inputText,
      this.analysisType,
      this.isOnline,
      this.maxInputLength
    );
  }

}