import { Injectable, OnDestroy } from '@angular/core';
import { Subscription, of, timer, forkJoin } from 'rxjs';
import { finalize, delay } from 'rxjs/operators';

import { AnalysisCalculationService } from './analysis-calculation.service';
import { AnalysisHistoryService } from './analysis-history.service';
import { AnalysisStateManager } from './analysis-state.service';

import { AnalysisType } from './analysis-type.enum';
import { PreviousAnalysis } from '../shared/models/previous-analysis.interface';

@Injectable({
    providedIn: 'root'
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

    private readonly MIN_LOADING_DURATION_MS = 1000;
    private subscriptions = new Subscription(); // Essential for managing RxJS subscriptions

    constructor(
        private analysisCalculationService: AnalysisCalculationService,
        private analysisHistoryService: AnalysisHistoryService,
        private analysisStateManager: AnalysisStateManager
    ) {
        this.log('constructor', 'Analysis Workflow Service initialized.');
    }

    /**
     * Orchestrates the text analysis process.
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
        this.analysisStateManager.clearErrorMessage();

        const mode = isOnline ? 'Online' : 'Offline'; // 'mode' is used below

        // 1. Primary Validation (consistent with button disabled state)
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
            mode // 'mode' is used here
        );

        if (existingAnalysis) {
            this.log(methodName, 'Found existing SUCCESSFUL analysis in history. Promoted it. No new analysis needed.');
            this.analysisStateManager.setLoading(false);
            return;
        }

        // 3. All checks passed: Proceed with starting a new analysis.
        this.startAnalysisProcess(inputText, analysisType, isOnline, mode); // 'mode' is passed here
    }

    private startAnalysisProcess(
        inputText: string,
        analysisType: AnalysisType,
        isOnline: boolean,
        mode: 'Online' | 'Offline' // 'mode' is received here
    ): void {
        const methodName = 'startAnalysisProcess';
        this.analysisStateManager.setLoading(true);
        const currentAnalysis: PreviousAnalysis = { // 'currentAnalysis' object is populated
            text: inputText,
            type: analysisType,
            mode: mode, // 'mode' is used here
            result: {},
            timestamp: new Date()
        };

        if (isOnline) {
            this.performOnlineAnalysis(inputText, analysisType, currentAnalysis, methodName);
        } else {
            this.performOfflineAnalysis(inputText, analysisType, currentAnalysis, methodName);
        }
    }

    private performOnlineAnalysis(
        inputText: string,
        analysisType: AnalysisType,
        currentAnalysis: PreviousAnalysis, // 'currentAnalysis' is used here
        methodName: string
    ): void {
        this.log(methodName, `Initiating online analysis request for type: ${analysisType}`);

        const httpRequest$ = this.analysisCalculationService.analyzeOnline(inputText, analysisType);
        const minLoadingDuration$ = timer(this.MIN_LOADING_DURATION_MS); // 'MIN_LOADING_DURATION_MS' is used here

        const subscription = forkJoin([httpRequest$, minLoadingDuration$]) // 'subscription' is used here
            .pipe(
                finalize(() => {
                    this.analysisStateManager.setLoading(false);
                    this.log(methodName, `Online analysis request finalized. isLoading set to: ${this.analysisStateManager.isLoading}`);
                })
            )
            .subscribe({
                next: ([result, _]) => {
                    currentAnalysis.result = result; // 'currentAnalysis' is used here
                    this.log(methodName, 'Online analysis request successful. Result received:', result);
                    this.analysisHistoryService.addAnalysis(currentAnalysis); // 'currentAnalysis' is used here
                },
                error: (err) => {
                    this.errorLog(methodName, 'Online analysis subscription ended with error.', err);
                    if (typeof currentAnalysis.result !== 'string' || !currentAnalysis.result.startsWith('Error:')) {
                        currentAnalysis.result = `Error: ${this.analysisStateManager.errorMessage || 'An error occurred during online analysis.'}`;
                    }
                    this.analysisHistoryService.addAnalysis(currentAnalysis); // 'currentAnalysis' is used here
                }
            });
        this.subscriptions.add(subscription); // 'subscriptions' is used here
    }

    private performOfflineAnalysis(
        inputText: string,
        analysisType: AnalysisType,
        currentAnalysis: PreviousAnalysis, // 'currentAnalysis' is used here
        methodName: string
    ): void {
        this.log(methodName, 'Performing offline analysis.');

        const subscription = of(this.analysisCalculationService.analyzeOffline(inputText, analysisType)) // 'subscription' is used here
            .pipe(
                delay(this.MIN_LOADING_DURATION_MS), // 'MIN_LOADING_DURATION_MS' is used here
                finalize(() => {
                    this.analysisStateManager.setLoading(false);
                    this.log(methodName, 'Offline analysis finalized after minimum duration.');
                })
            )
            .subscribe(result => {
                currentAnalysis.result = result; // 'currentAnalysis' is used here
                this.analysisHistoryService.addAnalysis(currentAnalysis); // 'currentAnalysis' is used here
                this.log(methodName, 'Offline analysis completed.');
            });
        this.subscriptions.add(subscription); // 'subscriptions' is used here
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe(); // 'subscriptions' is used here
        this.log('ngOnDestroy', 'Subscriptions unsubscribed.');
    }
}