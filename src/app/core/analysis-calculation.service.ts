import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AnalysisType } from './analysis-type.enum';
import { AnalysisResult } from '../shared/models/analysis-result.interface';

@Injectable({
    providedIn: 'root',
})
export class AnalysisCalculationService {
    private readonly apiUrl = 'http://localhost:8080/'; // Backend API URL

    constructor(private http: HttpClient) { }

    private isVowel(char: string): boolean {
        return 'aeiouAEIOU'.includes(char);
    }

    private isLetter(char: string): boolean {
        return char.toLowerCase() !== char.toUpperCase();
    }

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
            const vowels = ['a', 'e', 'i', 'o', 'u'];
            vowels.forEach((v) => (result[v.toUpperCase()] = 0));

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

    analyzeOnline(text: string, type: AnalysisType): Observable<AnalysisResult> {
        return this.http.get<AnalysisResult>(`${this.apiUrl + 'analyze'}`, {
            params: {
                type: type.toString(),
                text: text,
            },
        }).pipe(
            map(res => {
                // Ensure keys are uppercase for consistency with offline
                const formattedResult: AnalysisResult = {};
                for (const key in res) {
                    if (Object.prototype.hasOwnProperty.call(res, key)) {
                        formattedResult[key.toUpperCase()] = res[key];
                    }
                }
                return formattedResult;
            })
        );
    }
}