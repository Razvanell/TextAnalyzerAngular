import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AnalysisType } from './analysis-type.enum';
import { AnalysisResult } from '../shared/models/analysis-result.interface';
import { BackendAnalysisResult } from '../shared/models/analysis-result.backend.interface'; // Your new backend result interface
import { environment } from '../../environments/environment';

/**
 * Service responsible for performing text analysis, both offline (client-side)
 * and online (via a backend API). It provides methods to count vowels or consonants
 * in a given text.
 */
@Injectable({
    providedIn: 'root',
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
            // Only vowels found in the text will be added to the result.
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
     * @param text The input string to be analyzed.
     * @param type The type of analysis to perform (VOWELS or CONSONANTS).
     * @returns An Observable that emits the AnalysisResult (character counts) from the backend.
     */
    analyzeOnline(text: string, type: AnalysisType): Observable<AnalysisResult> {
        // Specify BackendAnalysisResult as the expected type for the raw HTTP response
        return this.http.get<BackendAnalysisResult>(`${this.apiUrl + 'analyze'}`, {
            params: {
                type: type.toString(),
                text: text,
            },
        }).pipe(
            // Use the map operator to extract the 'characterCounts' property
            // from the full BackendAnalysisResult received.
            map(backendResponse => {
                const counts = backendResponse.characterCounts;
                const formattedResult: AnalysisResult = {};

                // Iterate over the extracted counts to ensure keys are uppercase
                // for consistency with your offline analysis.
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
