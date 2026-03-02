import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { getAllSurveys } from '../../data/survey-storage';
import { type Survey } from '../../data/surveys';

type SurveyStats = { total: number; counts: Record<number, number[]> };
type SurveyStatsStore = Record<number, SurveyStats>;

@Component({
  selector: 'app-single-survey-page',
  imports: [RouterLink],
  templateUrl: './single-survey-page.html',
  styleUrl: './single-survey-page.scss',
})
export class SingleSurveyPage {
  protected selectedAnswers: Record<number, number[]> = {};
  protected totalResponses = 0;
  protected answerCounts: Record<number, number[]> = {};
  private readonly fallbackSurvey = getAllSurveys()[0];
  private readonly surveyStatsKey = 'pollapp:survey-stats';
  protected survey: Survey = this.fallbackSurvey;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    this.route.paramMap.subscribe((params) => {
      const surveys = getAllSurveys();
      const id = Number(params.get('id'));
      this.survey = surveys.find((item) => item.id === id) ?? surveys[0] ?? this.fallbackSurvey;
      this.selectedAnswers = {};
      this.loadSurveyStats();
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

  protected completeSurvey(): void {
    if (this.hasSelections()) this.saveSurveyResponse();
    void this.router.navigate(['/']);
  }

  protected getResultPercent(questionId: number, answerIndex: number): number {
    const votes = this.answerCounts[questionId]?.[answerIndex] ?? 0;
    return this.totalResponses ? Math.round((votes / this.totalResponses) * 100) : 0;
  }

  private hasSelections(): boolean {
    return Object.values(this.selectedAnswers).some((ids) => ids.length > 0);
  }

  private saveSurveyResponse(): void {
    const store = this.readSurveyStats();
    const current = store[this.survey.id] ?? { total: 0, counts: {} };
    current.total += 1;
    this.survey.questions.forEach((q) => this.addVotes(current, q.id, q.answers.length));
    store[this.survey.id] = current;
    localStorage.setItem(this.surveyStatsKey, JSON.stringify(store));
    this.answerCounts = current.counts;
    this.totalResponses = current.total;
  }

  private addVotes(stats: SurveyStats, questionId: number, answerCount: number): void {
    const selected = this.selectedAnswers[questionId] ?? [];
    const counts = stats.counts[questionId] ?? Array(answerCount).fill(0);
    selected.forEach((index) => {
      if (index >= 0 && index < counts.length) counts[index] += 1;
    });
    stats.counts[questionId] = counts;
  }

  private loadSurveyStats(): void {
    const stats = this.readSurveyStats()[this.survey.id];
    this.answerCounts = stats?.counts ?? {};
    this.totalResponses = stats?.total ?? 0;
  }

  private readSurveyStats(): SurveyStatsStore {
    try {
      const raw = localStorage.getItem(this.surveyStatsKey);
      return raw ? (JSON.parse(raw) as SurveyStatsStore) : {};
    } catch {
      return {};
    }
  }
}
