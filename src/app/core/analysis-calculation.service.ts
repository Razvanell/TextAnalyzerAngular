import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AnalysisType } from '../shared/models/analysis-type.enum';
import { AnalysisResult } from '../shared/models/analysis-result.interface';
import { BackendAnalysisResult } from '../shared/models/analysis-result.backend.interface';
import { environment } from '../../environments/environment';

/**
 * This service provides methods to count vowels or consonants from a text, both offline (client-side) and online (via a backend API). 
 */
@Injectable({
    providedIn: 'root', // Makes the service a singleton and available throughout the app
})
export class AnalysisCalculationService {
    // Base URL for the backend API, fetched from environment configuration.
    private readonly apiUrl = environment.apiBaseUrl;

    constructor(private http: HttpClient) { }

    private isVowel(char: string): boolean {
        return 'aeiouAEIOU'.includes(char);
    }

    private isLetter(char: string): boolean {
        return char.toLowerCase() !== char.toUpperCase();
    }

    /**
     * Performs text analysis directly on the client-side.
     * Only characters found in the text will be included in the result.
     * @param text The input string to be analyzed.
     * @param type The type of analysis to perform (VOWELS or CONSONANTS).
     * @returns An object (AnalysisResult) where keys are uppercase characters and values are their counts.
     */
    analyzeOffline(
        text: string,
        type: AnalysisType
    ): AnalysisResult {
        const result: AnalysisResult = {};
        if (!text) {
            return result;
        }

        const chars = text.split('');

        if (type === AnalysisType.VOWELS) {
            for (const char of chars) {
                if (this.isVowel(char)) {
                    const lowerChar = char.toLowerCase();
                    result[lowerChar.toUpperCase()] =
                        (result[lowerChar.toUpperCase()] || 0) + 1;
                }
            }
        } else if (type === AnalysisType.CONSONANTS) {
            for (const char of chars) {
                if (this.isLetter(char) && !this.isVowel(char)) {
                    const upperChar = char.toUpperCase();
                    result[upperChar] = (result[upperChar] || 0) + 1;
                }
            }
        }
        return result;
    }

    /**
     * Sends a request to the backend API to perform text analysis.
     * Errors will be handled by the global HttpInterceptor.
     * @param text The input string to be analyzed.
     * @param type The type of analysis to perform (VOWELS or CONSONANTS).
     * @returns An Observable that emits the AnalysisResult (character counts) from the backend.
     */
    analyzeOnline(text: string, type: AnalysisType): Observable<AnalysisResult> {
        return this.http.get<BackendAnalysisResult>(`${this.apiUrl + 'analyze'}`, {
            params: {
                type: type.toString(),
                text: text,
            },
        }).pipe(
            map(backendResponse => {
                const counts = backendResponse.characterCounts;
                const formattedResult: AnalysisResult = {};

                for (const key in counts) {
                    if (Object.prototype.hasOwnProperty.call(counts, key)) {
                        formattedResult[key.toUpperCase()] = counts[key];
                    }
                }
                return formattedResult;
            })
        );
    }

}
