export interface Diagnosis {
  name: string;
  probability: number;
  reasoning: string;
  suggested_tests: string[];
  treatment_plan: string;
}

export interface DiagnosisResponse {
  diagnoses: Diagnosis[];
  summary: string;
}

export enum Species {
  DOG = 'Dog',
  CAT = 'Cat',
  HORSE = 'Horse',
  COW = 'Cow',
  RABBIT = 'Rabbit',
  BIRD = 'Bird',
  EXOTIC = 'Exotic',
  OTHER = 'Other'
}

export type AnalysisMode = 'AI' | 'WEIGHTED';

export interface User {
  id: string;
  email: string;
  password: string; // Stored locally for this standalone app
  fullName: string;
  clinicName?: string;
  isAdmin?: boolean;
  savedScoringConfig?: {
    fileName: string;
    content: string;
  };
}

export interface CaseData {
  patientName: string;
  species: Species;
  breed: string;
  age: string;
  weight: string;
  clinicalSigns: string;
  labFindings: string;
  attachments: File[];
  analysisMode: AnalysisMode;
  scoringFile?: File;
}

export interface SavedCase {
  id: string;
  timestamp: number;
  userId?: string; // Link case to specific user
  data: CaseData;
  results: DiagnosisResponse;
}

export interface LoadingState {
  isLoading: boolean;
  message: string;
}