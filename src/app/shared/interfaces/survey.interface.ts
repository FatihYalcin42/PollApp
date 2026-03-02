export type SurveyQuestion = {
  id: number;
  prompt: string;
  hint: string;
  allowMultiple: boolean;
  answers: string[];
};

export type Survey = {
  id: number;
  category: string;
  title: string;
  description: string;
  daysLeft: number;
  questions: SurveyQuestion[];
};

export type SurveyStats = {
  total: number;
  counts: Record<number, number[]>;
};
