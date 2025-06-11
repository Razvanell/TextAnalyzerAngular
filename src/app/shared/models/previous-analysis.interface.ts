import { AnalysisType } from '../../core/analysis-type.enum';
import { AnalysisResult } from './analysis-result.interface';

export interface PreviousAnalysis {
  text: string;
  type: AnalysisType;
  mode: 'Online' | 'Offline';
  result: AnalysisResult | string;
  timestamp: Date;
}