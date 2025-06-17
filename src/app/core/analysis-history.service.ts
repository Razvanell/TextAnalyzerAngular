import { Injectable } from '@angular/core';
import { AnalysisResult } from '../shared/models/analysis-result.interface';
import { AnalysisType } from '../shared/models/analysis-type.enum';
import { PreviousAnalysis } from '../shared/models/previous-analysis.interface';

@Injectable({
  providedIn: 'root', // Makes the service a singleton and available throughout the app
})
export class AnalysisHistoryService {
  private readonly COMPONENT_NAME = '[AnalysisHistoryService]';
  private log(method: string, message: string, ...args: any[]): void {
    console.info(`${this.COMPONENT_NAME}[${method}] ${message}`, ...args);
  }

  private _previousAnalyses: PreviousAnalysis[] = [];

  /**
   * Exposes the current history as a read-only array.
   */
  get previousAnalyses(): PreviousAnalysis[] {
    return [...this._previousAnalyses]; // Return a shallow copy to prevent external modification
  }

  /**
   * Adds a new analysis to the history, placing it at the top.
   * @param analysis The analysis object to add.
   */
  addAnalysis(analysis: PreviousAnalysis): void {
    this._previousAnalyses.unshift(analysis);
    this.log('addAnalysis', 'Analysis added to history:', analysis);
  }

  /**
   * Finds a previously successful analysis in the history.
   * If found, it moves that analysis to the top of the history.
   * @param text The input text.
   * @param type The analysis type.
   * @param mode The analysis mode ('Online' or 'Offline').
   * @returns The existing PreviousAnalysis object if found and successful, otherwise undefined.
   */
  findAndPromoteSuccessfulAnalysis(text: string, type: AnalysisType, mode: 'Online' | 'Offline'): PreviousAnalysis | undefined {
    const methodName = 'findAndPromoteSuccessfulAnalysis';
    const existingAnalysis = this._previousAnalyses.find(analysis =>
      analysis.text === text &&
      analysis.type === type &&
      analysis.mode === mode &&
      !this.isErrorResult(analysis.result) // Only consider successful analyses
    );

    if (existingAnalysis) {
      this.log(methodName, 'Found existing SUCCESSFUL analysis in history. Promoting it.');
      const index = this._previousAnalyses.indexOf(existingAnalysis);
      if (index > -1) {
        this._previousAnalyses.splice(index, 1);
      }
      this._previousAnalyses.unshift(existingAnalysis);
    }
    return existingAnalysis;
  }

  /**
   * Checks if a given analysis result is an error string.
   * This helper is internal to the service as it defines what constitutes an "error" in the history.
   * @param result The analysis result (can be an object or a string).
   * @returns True if the result is an error string, false otherwise.
   */
  public isErrorResult(result: AnalysisResult | string): boolean {
    return typeof result === 'string' && result.startsWith('Error:');
  }

  /**
   * Formats the analysis result for display.
   * This is a utility method that can be used by the component or other services.
   * @param result The analysis result to format.
   * @returns A formatted string or an error message.
   */
  formatResult(result: AnalysisResult | string): string {
    if (typeof result === 'string') {
      return result; // Already an error message
    }
    if (Object.keys(result).length === 0) {
      return 'No relevant characters found or empty input.';
    }
    return Object.entries(result)
      .sort(([charA, countA], [charB, countB]) => charA.localeCompare(charB)) // Sorts alphabetically by character
      .map(([char, count]) => `Letter '${char}' appears ${count} times`)
      .join('<br>');
  }
}