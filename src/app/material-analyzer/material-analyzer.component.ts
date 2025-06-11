import { Component, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material Imports
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { CdkTextareaAutosize} from '@angular/cdk/text-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatListModule } from '@angular/material/list'; // <-- ADD THIS IMPORT

// Core Services and Models
import { AnalysisType } from '../core/analysis-type.enum';
import { AnalysisHistoryService } from '../core/analysis-history.service';
import { AnalysisStateManager } from '../core/analysis-state.service';
import { AnalysisWorkflowService } from '../core/analysis-workflow.service';

@Component({
  selector: 'app-material-analyzer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TitleCasePipe,
    // Angular Material Modules
    MatInputModule,
    MatFormFieldModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,
    MatIconModule,
    CdkTextareaAutosize,
    MatTooltipModule,
    MatListModule // <-- ADD THIS TO THE IMPORTS ARRAY
  ],
  templateUrl: './material-analyzer.component.html',
  styleUrls: ['./material-analyzer.component.css'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class MaterialAnalyzerComponent implements AfterViewInit {

  private readonly COMPONENT_NAME = '[MaterialAnalyzerComponent]';
  private log(method: string, message: string, ...args: any[]): void {
    console.info(`${this.COMPONENT_NAME}[${method}] ${message}`, ...args);
  }

  inputText: string = '';
  analysisType: AnalysisType = AnalysisType.VOWELS;
  isOnline: boolean = false;

  public readonly AnalysisType = AnalysisType;
  public readonly analysisTypes = Object.values(AnalysisType);
  public readonly maxInputLength: number = 250;

  @ViewChild('autosize') autosize!: CdkTextareaAutosize;

  constructor(
    public analysisHistoryService: AnalysisHistoryService,
    public analysisStateManager: AnalysisStateManager,
    private analysisWorkflowService: AnalysisWorkflowService
  ) { }

  ngAfterViewInit(): void {
    // This hook remains, though direct manipulation might not be needed
    // if cdkTextareaAutosize handles everything automatically.
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