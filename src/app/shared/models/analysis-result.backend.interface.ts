export interface BackendAnalysisResult {
    characterCounts: { [key: string]: number };
    originalText: string;
    analysisType: string; 
}
