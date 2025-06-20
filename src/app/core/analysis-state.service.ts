// src/app/core/analysis-state.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root', // Makes the service a singleton and available throughout the app
})
export class AnalysisStateManager {
    private readonly COMPONENT_NAME = '[AnalysisStateManager]';
    private log(method: string, message: string, ...args: any[]): void {
        console.info(`${this.COMPONENT_NAME}[${method}] ${message}`, ...args);
    }

    // BehaviorSubject holds the current value and emits it to new subscribers
    private _isLoading$$ = new BehaviorSubject<boolean>(false);
    private _errorMessage$$ = new BehaviorSubject<string | null>(null);

    // Expose them as Observables for components to subscribe to (read-only access)
    public readonly isLoading$: Observable<boolean> = this._isLoading$$.asObservable();
    public readonly errorMessage$: Observable<string | null> = this._errorMessage$$.asObservable();

    constructor() {
        this.log('constructor', 'Analysis State Manager initialized.');
    }

    /**
     * Sets the loading state.
     * @param loading
     */
    setLoading(loading: boolean): void {
        if (this._isLoading$$.getValue() !== loading) {
            this._isLoading$$.next(loading);
            this.log('setLoading', `Loading state set to: ${loading}`);
        }
    }

    /**
     * Sets an error message.
     * @param message The error message string, or null to clear.
     */
    setErrorMessage(message: string | null): void {
        if (this._errorMessage$$.getValue() !== message) {
            this._errorMessage$$.next(message);
            this.log('setErrorMessage', `Error message set to: ${message}`);
        }
    }

    /**
     * Clears the current error message.
     */
    clearErrorMessage(): void {
        this.setErrorMessage(null);
        this.log('clearErrorMessage', 'Error message cleared.');
    }

    /**
     * Gets the current loading state value directly (for immediate checks, e.g., in a getter).
     */
    get isLoading(): boolean {
        return this._isLoading$$.getValue();
    }

    /**
     * Gets the current error message value directly.
     */
    get errorMessage(): string | null {
        return this._errorMessage$$.getValue();
    }

    /**
     * Provides a tooltip message for the analyze button based on loading state or input validity.
     * @param inputText The current input text from the component.
     * @param maxInputLength The maximum allowed input length.
     * @returns A tooltip message string, or null if the button should be enabled.
     */
    getAnalysisButtonTooltipText(
        inputText: string,
        maxInputLength: number
    ): string | null {
        if (this.isLoading) {
            return 'Analysis in progress...';
        }
        if (!inputText || inputText.trim() === '') {
            return 'Input cannot be empty.';
        }
        if (inputText.length > maxInputLength) {
            return `Input exceeds maximum character limit of ${maxInputLength}.`;
        }

        return ''; // Return an empty text if the button should be enabled
    }
}