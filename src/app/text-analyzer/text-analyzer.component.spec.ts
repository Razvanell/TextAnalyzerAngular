// src/app/text-analyzer/text-analyzer.component.spec.ts
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, NgModel } from '@angular/forms'; // Import NgModel
// NEW IMPORTS for HttpClient testing
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { By } from '@angular/platform-browser'; // Needed for querying elements in tests
import { TitleCasePipe } from '@angular/common'; // Also needed for the pipe in providers

import { TextAnalyzerComponent } from './text-analyzer.component';
import { AnalysisHistoryService } from '../core/analysis-history.service';
import { AnalysisStateManager } from '../core/analysis-state.service';
import { AnalysisWorkflowService } from '../core/analysis-workflow.service';
import { AnalysisCalculationService } from '../core/analysis-calculation.service';
import { AnalysisType } from '../shared/models/analysis-type.enum';
import { AnalysisResult } from '../shared/models/analysis-result.interface';

// --- Mock Services ---
const mockHistoryService = jasmine.createSpyObj('AnalysisHistoryService', [
  'addEntry', 'clearHistory', 'isErrorResult', 'formatResult'
], {
  previousAnalyses: []
});

const mockStateManager = jasmine.createSpyObj('AnalysisStateManager', [
  'setResult', 'setErrorMessage', 'setLoading', 'getAnalysisButtonTooltipText'
], {
  analysisResult: null,
  errorMessage: '',
  isLoading: false
});
// REMOVED: Initial callFake for getAnalysisButtonTooltipText from here.
// It will be set per test for better control.

const mockWorkflowService = jasmine.createSpyObj('AnalysisWorkflowService', [
  'analyzeText'
]);

const mockCalculationService = jasmine.createSpyObj('AnalysisCalculationService', [
  'analyzeOffline', 'analyzeOnline'
]);


describe('TextAnalyzerComponent', () => {
  let component: TextAnalyzerComponent;
  let fixture: ComponentFixture<TextAnalyzerComponent>;

  beforeEach(async () => {
    // Reset spy calls and mock state before *each* test setup
    mockHistoryService.addEntry.calls.reset();
    mockHistoryService.clearHistory.calls.reset();
    mockHistoryService.isErrorResult.calls.reset();
    mockHistoryService.formatResult.calls.reset();
    mockHistoryService.previousAnalyses = [];

    mockStateManager.setResult.calls.reset();
    mockStateManager.setErrorMessage.calls.reset();
    mockStateManager.setLoading.calls.reset();
    mockStateManager.getAnalysisButtonTooltipText.calls.reset(); // Resetting the spy is important
    mockStateManager.analysisResult = null;
    mockStateManager.errorMessage = '';
    mockStateManager.isLoading = false;
    // We will set the callFake for getAnalysisButtonTooltipText in relevant tests now
    // Re-assign the custom fake as reset() clears it (for tests that rely on this general behavior)
    mockStateManager.getAnalysisButtonTooltipText.and.callFake((inputText: string, maxLength: number) => {
      if (mockStateManager.isLoading) {
        return 'Loading...';
      }
      if (inputText.length === 0) {
        return 'Enter text to analyze';
      }
      if (inputText.length > maxLength) {
        return `Text exceeds ${maxLength} characters.`;
      }
      return '';
    });


    mockWorkflowService.analyzeText.calls.reset();
    mockCalculationService.analyzeOffline.calls.reset();
    mockCalculationService.analyzeOnline.calls.reset();


    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        TextAnalyzerComponent,
      ],
      providers: [
        { provide: AnalysisHistoryService, useValue: mockHistoryService },
        { provide: AnalysisStateManager, useValue: mockStateManager },
        { provide: AnalysisWorkflowService, useValue: mockWorkflowService },
        { provide: AnalysisCalculationService, useValue: mockCalculationService },
        TitleCasePipe,
        // NEW: Provide HttpClient and its testing utilities
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TextAnalyzerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Initial change detection
  });

  // --- Step 1: Component Creation Test ---
  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // --- Step 2: Initial State Tests ---
  it('should initialize with default values', () => {
    expect(component.inputText).toBe('');
    expect(component.analysisType).toBe(AnalysisType.VOWELS);
    expect(component.isOnline).toBeFalse();
    expect(component.AnalysisType).toEqual(AnalysisType); // Check direct enum reference
    expect(component.analysisTypes).toEqual(Object.values(AnalysisType)); // Check array of enum values
    expect(component.maxInputLength).toBe(250);
  });

  // --- Step 2: Analysis Delegation Test (Button Click) ---
  it('should call analysisWorkflowService.analyzeText when analyzeText is invoked', () => {
    component.inputText = 'sample text';
    component.analysisType = AnalysisType.CONSONANTS;
    component.isOnline = true;
    fixture.detectChanges(); // Update component properties and template

    // Find the analyze button and simulate a click
    const analyzeButton = fixture.debugElement.query(By.css('button'));
    expect(analyzeButton).withContext('Expected analyze button to be found').toBeTruthy();
    analyzeButton.triggerEventHandler('click', null);

    // Assert that the workflow service's analyzeText method was called with the correct parameters
    expect(mockWorkflowService.analyzeText).toHaveBeenCalledWith(
      'sample text',
      AnalysisType.CONSONANTS,
      true,
      250
    );
  });

  // --- Step 3: UI Interaction Tests (ngModel) ---
  it('should update inputText when textarea value changes', fakeAsync(() => {
    const textarea = fixture.debugElement.query(By.css('textarea')).nativeElement;
    textarea.value = 'new input text';
    textarea.dispatchEvent(new Event('input')); // Simulate user typing
    tick(); // Process any async operations from ngModel
    fixture.detectChanges(); // Update the component and template
    expect(component.inputText).toBe('new input text');
  }));

  it('should update analysisType when radio button changes', fakeAsync(() => {
    // Ensure template is fully rendered and all async operations are complete
    fixture.detectChanges();
    fixture.detectChanges(); // Trigger another change detection after stability

    // Query all radio input DebugElements
    const allRadioDebugElements = fixture.debugElement.queryAll(By.css('.radio-group input[type="radio"]'));

    // Explicitly assert the expected number of radio buttons are rendered
    expect(allRadioDebugElements.length).withContext('Expected exactly two radio buttons (VOWELS, CONSONANTS) to be found').toBe(Object.values(AnalysisType).length);

    // Find the specific CONSONANTS radio button DebugElement
    const radioConsonantsDebugEl = allRadioDebugElements.find(el => el.nativeElement.getAttribute('value') === AnalysisType.CONSONANTS);
    expect(radioConsonantsDebugEl).withContext('Expected CONSONANTS radio button to be found').toBeTruthy();

    // Get the NgModel instance associated with the radio button
    const ngModelConsonants = radioConsonantsDebugEl!.injector.get(NgModel);
    ngModelConsonants.control.setValue(AnalysisType.CONSONANTS); // Directly set value on NgControl
    tick(); // Process the ngModel update
    fixture.detectChanges(); // Update component and template after NgModel update
    console.log('component.analysisType AFTER CONSONANTS click (via setValue):', component.analysisType); // Added log
    expect(component.analysisType).toBe(AnalysisType.CONSONANTS);


    // Find the specific VOWELS radio button DebugElement
    const radioVowelsDebugEl = allRadioDebugElements.find(el => el.nativeElement.getAttribute('value') === AnalysisType.VOWELS);
    expect(radioVowelsDebugEl).withContext('Expected VOWELS radio button to be found').toBeTruthy();

    // Get the NgModel instance associated with the radio button
    const ngModelVowels = radioVowelsDebugEl!.injector.get(NgModel);
    ngModelVowels.control.setValue(AnalysisType.VOWELS); // Directly set value on NgControl
    tick();
    fixture.detectChanges();
    console.log('component.analysisType AFTER VOWELS click (via setValue):', component.analysisType); // Added log
    expect(component.analysisType).toBe(AnalysisType.VOWELS);
  }));

  it('should update isOnline when toggle switch changes', fakeAsync(() => {
    const toggleCheckbox = fixture.debugElement.query(By.css('.toggle-switch input[type="checkbox"]')).nativeElement;
    toggleCheckbox.click(); // Simulate clicking the checkbox
    tick(); // Process ngModel update
    fixture.detectChanges(); // Update component and template
    expect(component.isOnline).toBeTrue();
    expect(fixture.debugElement.query(By.css('.toggle-label')).nativeElement.textContent).toContain('Online');

    toggleCheckbox.click(); // Click again to toggle back
    tick();
    fixture.detectChanges();
    expect(component.isOnline).toBeFalse();
    expect(fixture.debugElement.query(By.css('.toggle-label')).nativeElement.textContent).toContain('Offline');
  }));

  // --- Step 3: Character Count Display Tests ---
  it('should display correct character count', fakeAsync(() => {
    component.inputText = 'abc';
    fixture.detectChanges(); // Update component property
    tick(); // Process input change detection

    const charCountSpan = fixture.debugElement.query(By.css('.char-count')).nativeElement;
    expect(charCountSpan.textContent.trim()).toBe('3 / 250');
  }));

  it('should apply limit-reached class when input length is at or above maxInputLength', fakeAsync(() => {
    component.inputText = 'a'.repeat(250); // At max length
    fixture.detectChanges();
    tick();
    const charCountSpan = fixture.debugElement.query(By.css('.char-count'));
    expect(charCountSpan.nativeElement).toHaveClass('limit-reached');
  }));

  it('should disable analyze button based on AnalysisStateManager.getAnalysisButtonTooltipText', () => {
    // Simulate disabled condition where tooltip has text
    mockStateManager.getAnalysisButtonTooltipText.and.returnValue('Text too short');
    fixture.detectChanges(); // Trigger update
    const analyzeButton = fixture.debugElement.query(By.css('button'));
    expect(analyzeButton).toBeTruthy();
    expect(analyzeButton.nativeElement.disabled).toBeTrue();
    expect(analyzeButton.nativeElement.title).toBe('Text too short');
    expect(analyzeButton.nativeElement).not.toHaveClass('active');

    // Simulate enabled condition where tooltip is empty
    mockStateManager.getAnalysisButtonTooltipText.and.returnValue('');
    fixture.detectChanges(); // Trigger update
    expect(analyzeButton.nativeElement.disabled).toBeFalse();
    expect(analyzeButton.nativeElement.title).toBe('');
    expect(analyzeButton.nativeElement).toHaveClass('active');
  });

});
