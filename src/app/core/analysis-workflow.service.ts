import { Injectable, OnDestroy } from '@angular/core';
import { Subscription, of, timer, forkJoin } from 'rxjs';
import { finalize, delay } from 'rxjs/operators';

import { AnalysisCalculationService } from './analysis-calculation.service';
import { AnalysisHistoryService } from './analysis-history.service';
import { AnalysisStateManager } from './analysis-state.service';

import { AnalysisType } from '../shared/models/analysis-type.enum';
import { PreviousAnalysis } from '../shared/models/previous-analysis.interface';

@Injectable({
    providedIn: 'root' // Makes the service a singleton and available throughout the app
})
export class AnalysisWorkflowService implements OnDestroy {

    // Keeping COMPONENT_NAME and log/errorLog methods for debugging/tracing.
    private readonly COMPONENT_NAME = '[AnalysisWorkflowService]';
    private log(method: string, message: string, ...args: any[]): void {
        console.info(`${this.COMPONENT_NAME}[${method}] ${message}`, ...args);
    }
    private errorLog(method: string, message: string, ...args: any[]): void {
        console.error(`${this.COMPONENT_NAME}[${method}] ${message}`, ...args);
    }

    private readonly MIN_LOADING_DURATION_MS = 600; // Minimum duration to show a loading spinner
    private subscriptions = new Subscription(); // Essential for managing RxJS subscriptions

    constructor(
        private analysisCalculationService: AnalysisCalculationService,
        private analysisHistoryService: AnalysisHistoryService,
        private analysisStateManager: AnalysisStateManager
    ) {
        this.log('constructor', 'Analysis Workflow Service initialized.');
    }

    /**
     * Handles the text analysis process.
     * This method contains the shared logic for validation, history check, and initiating analysis.
     * @param inputText The text to analyze.
     * @param analysisType The type of analysis to perform.
     * @param isOnline Whether to perform online or offline analysis.
     * @param maxInputLength The maximum allowed length for the input text.
     */
    analyzeText(
        inputText: string,
        analysisType: AnalysisType,
        isOnline: boolean,
        maxInputLength: number
    ): void {
        const methodName = 'analyzeText';
        const mode = isOnline ? 'Online' : 'Offline';
        this.analysisStateManager.clearErrorMessage();

        // 1. Primary Validation: Checks if input is valid or if analysis is already in progress.
        const validationReason = this.analysisStateManager.getAnalysisButtonTooltipText(
            inputText,
            maxInputLength
        );

        if (validationReason) {
            this.analysisStateManager.setErrorMessage(validationReason);
            this.log(methodName, `Client-side validation failed or analysis in progress: ${validationReason}. Request aborted.`);
            return;
        }

        // 2. History Check (only if primary validation passes)
        const existingAnalysis = this.analysisHistoryService.findAndPromoteSuccessfulAnalysis(
            inputText,
            analysisType,
            mode
        );

        if (existingAnalysis) {
            this.log(methodName, 'Found existing SUCCESSFUL analysis in history. Promoted it. No new analysis needed.');
            this.analysisStateManager.setLoading(false);
            return;
        }

        // 3. All checks passed: Proceed with starting a new analysis.
        this.startAnalysisProcess(inputText, analysisType, isOnline, mode);
    }

    /**
     * Initiates the actual analysis process, setting loading state and determining online/offline execution.
     * @param inputText The text to analyze.
     * @param analysisType The type of analysis to perform.
     * @param isOnline Whether to perform online or offline analysis.
     * @param mode The analysis mode ('Online' or 'Offline') string.
     */
    private startAnalysisProcess(
        inputText: string,
        analysisType: AnalysisType,
        isOnline: boolean,
        mode: 'Online' | 'Offline'
    ): void {
        const methodName = 'startAnalysisProcess';
        this.analysisStateManager.setLoading(true);

        // Creates an object to represent the current analysis, which will be added to history.
        const currentAnalysis: PreviousAnalysis = {
            text: inputText,
            type: analysisType,
            mode: mode,
            result: {},
            timestamp: new Date()
        };

        if (isOnline) {
            this.performOnlineAnalysis(inputText, analysisType, currentAnalysis, methodName);
        } else {
            this.performOfflineAnalysis(inputText, analysisType, currentAnalysis, methodName);
        }
    }

    /**
     * Handles the execution of an online text analysis, via HTTP request.
     * @param inputText The text for analysis.
     * @param analysisType The type of analysis.
     * @param currentAnalysis The `PreviousAnalysis` object to update and save.
     * @param methodName The name of the calling method for logging.
     */
    private performOnlineAnalysis(
        inputText: string,
        analysisType: AnalysisType,
        currentAnalysis: PreviousAnalysis,
        methodName: string
    ): void {
        this.log(methodName, `Initiating online analysis request for type: ${analysisType}`);

        const httpRequest$ = this.analysisCalculationService.analyzeOnline(inputText, analysisType); // Observable for the analysis HTTP request
        const minLoadingDuration$ = timer(this.MIN_LOADING_DURATION_MS);

        // Combines observables: HTTP request & loading timer so both complete before processing results.
        const subscription = forkJoin([httpRequest$, minLoadingDuration$])
            .pipe( // chain together RxJS operators
                finalize(() => {
                    this.analysisStateManager.setLoading(false);
                })
            )
            .subscribe({   // Subscribes to the combined observable to handle success (next) or error.
                next: ([result, _]) => { // `_` indicates the second value (timer) is ignored
                    currentAnalysis.result = result;
                    this.log(methodName, 'Online analysis request successful. Result received:', result);
                    this.analysisHistoryService.addAnalysis(currentAnalysis);
                },
                error: (err) => {
                    this.errorLog(methodName, 'Online analysis subscription ended with error.', err);
                    if (typeof currentAnalysis.result !== 'string' || !currentAnalysis.result.startsWith('Error:')) {
                        currentAnalysis.result = `Error: ${this.analysisStateManager.errorMessage || 'An error occurred during online analysis.'}`;
                    }
                    this.analysisHistoryService.addAnalysis(currentAnalysis);
                }
            });
        this.subscriptions.add(subscription);
    }

    /**
     * Handles the execution of an offline (local) text analysis.
     * @param inputText The text for analysis.
     * @param analysisType The type of analysis.
     * @param currentAnalysis The `PreviousAnalysis` object to update and save.
     * @param methodName The name of the calling method for logging.
     */
    private performOfflineAnalysis(
        inputText: string,
        analysisType: AnalysisType,
        currentAnalysis: PreviousAnalysis,
        methodName: string
    ): void {
        this.log(methodName, 'Performing offline analysis.');

        // Creates an observable from a synchronous calculation result using `of()`.
        const subscription = of(this.analysisCalculationService.analyzeOffline(inputText, analysisType))
            .pipe(
                delay(this.MIN_LOADING_DURATION_MS),
                finalize(() => {
                    this.analysisStateManager.setLoading(false);
                })
            )
            .subscribe(result => { // Subscribes to the observable to receive the calculated result.
                currentAnalysis.result = result;
                this.analysisHistoryService.addAnalysis(currentAnalysis);
                this.log(methodName, 'Offline analysis completed.');
            });
        this.subscriptions.add(subscription);
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
}