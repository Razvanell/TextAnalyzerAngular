import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AnalysisResult {
  [key: string]: number;
}

@Injectable({
  providedIn: 'root',
})
export class TextAnalyzerService {
  private readonly apiUrl = 'http://localhost:8080/'; // Backend API URL

  constructor(private http: HttpClient) {}

  // Refactored offline text analysis logic
  private isVowel(char: string): boolean {
    return 'aeiouAEIOU'.includes(char);
  }

  private isLetter(char: string): boolean {
    return char.toLowerCase() !== char.toUpperCase(); // Checks if character is a letter
  }

  analyzeOffline(
    text: string,
    type: 'vowels' | 'consonants'
  ): AnalysisResult {
    const result: AnalysisResult = {};
    if (!text) {
      return result;
    }

    const chars = text.split('');

    if (type === 'vowels') {
      const vowels = ['a', 'e', 'i', 'o', 'u'];
      vowels.forEach((v) => (result[v.toUpperCase()] = 0)); 

      for (const char of chars) {
        if (this.isVowel(char)) {
          const lowerChar = char.toLowerCase();
          result[lowerChar.toUpperCase()] =
            (result[lowerChar.toUpperCase()] || 0) + 1;
        }
      }
    } else if (type === 'consonants') {
      for (const char of chars) {
        if (this.isLetter(char) && !this.isVowel(char)) {
          const upperChar = char.toUpperCase();
          result[upperChar] = (result[upperChar] || 0) + 1;
        }
      }
    }
    return result;
  }

  analyzeOnline(text: string, type: 'vowels' | 'consonants'): Observable<AnalysisResult> {
    return this.http.get<AnalysisResult>(`${this.apiUrl + 'analyze'}`, {
      params: {
        type: type,
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