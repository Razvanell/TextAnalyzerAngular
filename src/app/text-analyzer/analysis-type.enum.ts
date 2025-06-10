export enum AnalysisType {
  VOWELS = 'VOWELS',
  CONSONANTS = 'CONSONANTS'
}

export interface AnalysisResult {
  [key: string]: number;
}