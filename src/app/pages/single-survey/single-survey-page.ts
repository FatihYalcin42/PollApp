import { Component } from '@angular/core';

const SURVEY_SETTINGS_KEY = 'pollapp:survey-settings';
type SurveySettings = { allowMultipleAnswers?: boolean; surveyTitle?: string };

type SurveyAnswer = { id: number; label: string };

@Component({
  selector: 'app-single-survey-page',
  templateUrl: './single-survey-page.html',
  styleUrl: './single-survey-page.scss',
})
export class SingleSurveyPage {
  protected allowMultipleAnswers = false;
  protected selectedAnswerIds: number[] = [];
  protected questionTitle = 'Untitled survey';
  protected readonly answers: SurveyAnswer[] = [
    { id: 1, label: 'Monday' },
    { id: 2, label: 'Wednesday' },
    { id: 3, label: 'Friday' },
    { id: 4, label: 'Sunday' },
  ];

  constructor() {
    const settings = this.readSurveySettings();
    this.allowMultipleAnswers = !!settings.allowMultipleAnswers;
    this.questionTitle = settings.surveyTitle?.trim() || 'Untitled survey';
  }

  protected toggleAnswer(answerId: number): void {
    if (this.allowMultipleAnswers) {
      const ids = new Set(this.selectedAnswerIds);
      ids.has(answerId) ? ids.delete(answerId) : ids.add(answerId);
      this.selectedAnswerIds = [...ids];
      return;
    }

    this.selectedAnswerIds = this.selectedAnswerIds[0] === answerId ? [] : [answerId];
  }

  protected isAnswerSelected(answerId: number): boolean {
    return this.selectedAnswerIds.includes(answerId);
  }

  private readSurveySettings(): SurveySettings {
    try {
      const raw = localStorage.getItem(SURVEY_SETTINGS_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as SurveySettings;
    } catch {
      return {};
    }
  }
}
