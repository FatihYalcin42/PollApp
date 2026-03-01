import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SURVEYS, type Survey } from '../../data/surveys';

@Component({
  selector: 'app-single-survey-page',
  imports: [RouterLink],
  templateUrl: './single-survey-page.html',
  styleUrl: './single-survey-page.scss',
})
export class SingleSurveyPage {
  protected selectedAnswers: Record<number, number[]> = {};
  private readonly fallbackSurvey = SURVEYS[0];
  protected survey: Survey = this.fallbackSurvey;

  constructor(private readonly route: ActivatedRoute) {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      this.survey = SURVEYS.find((item) => item.id === id) ?? this.fallbackSurvey;
      this.selectedAnswers = {};
    });
  }

  protected toggleAnswer(questionId: number, answerIndex: number): void {
    const question = this.survey.questions.find((item) => item.id === questionId);
    if (!question) return;
    const current = this.selectedAnswers[questionId] ?? [];
    const next = question.allowMultiple
      ? current.includes(answerIndex)
        ? current.filter((id) => id !== answerIndex)
        : [...current, answerIndex]
      : current[0] === answerIndex ? [] : [answerIndex];
    this.selectedAnswers = { ...this.selectedAnswers, [questionId]: next };
  }

  protected isAnswerSelected(questionId: number, answerIndex: number): boolean {
    return (this.selectedAnswers[questionId] ?? []).includes(answerIndex);
  }

  protected getAnswerLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }
}
