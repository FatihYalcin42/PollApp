import { Component } from '@angular/core';

const SURVEY_SETTINGS_KEY = 'pollapp:survey-settings';

type SurveyAnswer = { id: number; label: string };

@Component({
  selector: 'app-single-survey-page',
  templateUrl: './single-survey-page.html',
  styleUrl: './single-survey-page.scss',
})
export class SingleSurveyPage {
  protected allowMultipleAnswers = false;
  protected selectedAnswerIds: number[] = [];
  protected readonly questionTitle = 'Which date would work best for you?';
  protected readonly answers: SurveyAnswer[] = [
    { id: 1, label: 'Monday' },
    { id: 2, label: 'Wednesday' },
    { id: 3, label: 'Friday' },
    { id: 4, label: 'Sunday' },
  ];

  constructor() {
    this.allowMultipleAnswers = this.readAllowMultipleAnswers();
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

  private readAllowMultipleAnswers(): boolean {
    try {
      const raw = localStorage.getItem(SURVEY_SETTINGS_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { allowMultipleAnswers?: boolean };
      return !!parsed.allowMultipleAnswers;
    } catch {
      return false;
    }
  }
}
