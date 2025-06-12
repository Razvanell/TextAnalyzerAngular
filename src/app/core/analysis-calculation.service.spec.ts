import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AnalysisCalculationService } from './analysis-calculation.service';
import { AnalysisType } from '../shared/models/analysis-type.enum';
import { environment } from '../../environments/environment';
import { BackendAnalysisResult } from '../shared/models/analysis-result.backend.interface';
import { AnalysisResult } from '../shared/models/analysis-result.interface';

describe('AnalysisCalculationService', () => {
  let service: AnalysisCalculationService;
  let httpTestingController: HttpTestingController;
  const apiUrl = environment.apiBaseUrl; // Get the API URL from the environment

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AnalysisCalculationService,
        provideHttpClient(),
        provideHttpClientTesting()
      ],
    });

    // Inject the service instance and HttpTestingController for mocking HTTP requests
    service = TestBed.inject(AnalysisCalculationService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  // After each test, ensure that there are no outstanding HTTP requests
  afterEach(() => {
    httpTestingController.verify();
  });

  // --- Test for component creation ---
  it('should create the service', () => {
    expect(service).toBeTruthy();
  });

  // --- Test suite for client-side (offline) analysis method ---
  describe('analyzeOffline', () => {

    it('should correctly count vowels in a simple text', () => {
      const text = 'Hello World';
      const result = service.analyzeOffline(text, AnalysisType.VOWELS);
      // Expected vowel counts: E:1, O:2. Case-insensitive, non-letters ignored.
      expect(result).toEqual({ E: 1, O: 2 });
    });

    it('should correctly count consonants in a simple text', () => {
      const text = 'Hello World';
      const result = service.analyzeOffline(text, AnalysisType.CONSONANTS);
      // Expected consonant counts: H:1, L:3, W:1, R:1, D:1. Case-insensitive, non-letters ignored.
      expect(result).toEqual({ H: 1, L: 3, W: 1, R: 1, D: 1 });
    });

    it('should return an empty object for an empty string input', () => {
      const text = '';
      const resultVowels = service.analyzeOffline(text, AnalysisType.VOWELS);
      const resultConsonants = service.analyzeOffline(text, AnalysisType.CONSONANTS);
      expect(resultVowels).toEqual({});
      expect(resultConsonants).toEqual({});
    });

    it('should handle text with mixed case for vowels, normalizing to uppercase keys', () => {
      const text = 'AEIoUaEiOu';
      const result = service.analyzeOffline(text, AnalysisType.VOWELS);
      // All vowels should be counted and normalized to uppercase keys
      expect(result).toEqual({ A: 2, E: 2, I: 2, O: 2, U: 2 });
    });

    it('should handle text with mixed case for consonants, normalizing to uppercase keys', () => {
      const text = 'bCdEfGhIj';
      const result = service.analyzeOffline(text, AnalysisType.CONSONANTS);
      // All consonants should be counted and normalized to uppercase keys
      expect(result).toEqual({ B: 1, C: 1, D: 1, F: 1, G: 1, H: 1, J: 1 });
    });

    it('should ignore non-alphabetic characters when counting vowels', () => {
      const text = 'H3llo W0rld!';
      const result = service.analyzeOffline(text, AnalysisType.VOWELS);
      expect(result).toEqual({ O: 1 });
    });

    it('should ignore non-alphabetic characters when counting consonants', () => {
      const text = 'H3llo W0rld!';
      const result = service.analyzeOffline(text, AnalysisType.CONSONANTS);
      // 'H', 'L', 'L', 'W', 'R', 'L', 'D' are consonants, non-letters are ignored
      expect(result).toEqual({ H: 1, L: 3, W: 1, R: 1, D: 1 });
    });

    it('should correctly handle special characters and numbers, excluding them from counts', () => {
      const text = '123 ABC def!@#';
      const resultVowels = service.analyzeOffline(text, AnalysisType.VOWELS);
      const resultConsonants = service.analyzeOffline(text, AnalysisType.CONSONANTS);

      expect(resultVowels).toEqual({ A: 1, E: 1 }); // Only 'A', 'E' are vowels
      expect(resultConsonants).toEqual({ B: 1, C: 1, D: 1, F: 1 }); // Only 'B', 'C', 'D', 'F' are consonants
    });
  });

  // --- Test suite for backend (online) analysis method ---
  describe('analyzeOnline', () => {

    it('should make a GET request and map backend response for vowels analysis', (done) => {
      const text = 'TestVowels';
      const type = AnalysisType.VOWELS;
      const mockBackendResponse: BackendAnalysisResult = {
        originalText: text,
        analysisType: type.toString(),
        characterCounts: { T: 2, E: 2, S: 1, V: 1, O: 1, W: 1, L: 1 },
      };
      const expectedResult: AnalysisResult = {
        T: 2, E: 2, S: 1, V: 1, O: 1, W: 1, L: 1,
      };

      service.analyzeOnline(text, type).subscribe((result) => {
        expect(result).toEqual(expectedResult);
        done(); // Signal that the asynchronous test is complete
      });

      // Expect a single GET request to the correct API endpoint with the specified parameters
      const req = httpTestingController.expectOne(
        `${apiUrl}analyze?type=${type.toString()}&text=${text}`
      );
      expect(req.request.method).toBe('GET');

      // Respond to the intercepted request with the mock data
      req.flush(mockBackendResponse);
    });

    it('should make a GET request and map backend response for consonants analysis', (done) => {
      const text = 'TestConsonants';
      const type = AnalysisType.CONSONANTS;
      const mockBackendResponse: BackendAnalysisResult = {
        originalText: text,
        analysisType: type.toString(),
        characterCounts: { T: 2, S: 3, C: 1, N: 2 },
      };
      const expectedResult: AnalysisResult = {
        T: 2, S: 3, C: 1, N: 2,
      };

      service.analyzeOnline(text, type).subscribe((result) => {
        expect(result).toEqual(expectedResult);
        done(); // Signal that the asynchronous test is complete
      });

      const req = httpTestingController.expectOne(
        `${apiUrl}analyze?type=${type.toString()}&text=${text}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockBackendResponse);
    });

    it('should handle empty characterCounts from backend response', (done) => {
      const text = 'EmptyCase';
      const type = AnalysisType.VOWELS;
      const mockBackendResponse: BackendAnalysisResult = {
        originalText: text,
        analysisType: type.toString(),
        characterCounts: {},
      };
      const expectedResult: AnalysisResult = {};

      service.analyzeOnline(text, type).subscribe((result) => {
        expect(result).toEqual(expectedResult);
        done(); // Signal that the asynchronous test is complete
      });

      const req = httpTestingController.expectOne(
        `${apiUrl}analyze?type=${type.toString()}&text=${text}`
      );
      req.flush(mockBackendResponse);
    });

    it('should correctly format keys from backend response (ensure uppercase)', (done) => {
      const text = 'MixedCaseBackend';
      const type = AnalysisType.VOWELS;
      const mockBackendResponse: BackendAnalysisResult = {
        originalText: text,
        analysisType: type.toString(),
        characterCounts: { A: 1, e: 2, I: 1, o: 3 }, // Backend might return mixed case keys
      };
      const expectedResult: AnalysisResult = {
        A: 1, E: 2, I: 1, O: 3, // Service should convert all keys to uppercase
      };

      service.analyzeOnline(text, type).subscribe((result) => {
        expect(result).toEqual(expectedResult);
        done(); // Signal that the asynchronous test is complete
      });

      const req = httpTestingController.expectOne(
        `${apiUrl}analyze?type=${type.toString()}&text=${text}`
      );
      req.flush(mockBackendResponse);
    });

    it('should handle a backend error gracefully', (done) => {
      const text = 'ErrorText';
      const type = AnalysisType.CONSONANTS;
      // Create a mock ErrorEvent to simulate a network error
      const mockError = new ErrorEvent('Network error', {
        message: 'simulated network error',
      });

      service.analyzeOnline(text, type).subscribe({
        next: () => fail('Expected to fail with an error, but received a next value'),
        error: (error) => {
          expect(error.error).toEqual(mockError); // Verify the error object content
          expect(error.status).toBe(500); // Verify the HTTP status code
          done(); // Signal that the asynchronous test is complete
        },
      });

      // Expect the request and simulate an error response
      const req = httpTestingController.expectOne(
        `${apiUrl}analyze?type=${type.toString()}&text=${text}`
      );
      req.error(mockError, { status: 500, statusText: 'Server Error' });
    });
  });
});
