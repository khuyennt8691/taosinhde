
export enum CognitiveLevel {
  RECOGNIZE = 'Nhận biết',
  UNDERSTAND = 'Thông hiểu',
  APPLY = 'Vận dụng',
  HIGH_APPLY = 'Vận dụng cao'
}

export interface Question {
  id: string;
  order: number;
  content: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: 'A' | 'B' | 'C' | 'D';
  solution: string;
  topic: string;
  level: CognitiveLevel;
}

export interface ExamMatrix {
  topic: string;
  recognize: number;
  understand: number;
  apply: number;
  highApply: number;
  total: number;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  questions: Question[];
  matrix: ExamMatrix[];
}

export interface GenerationConfig {
  difficultyAdjustment: 'easier' | 'original' | 'harder';
  variantCount: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}
