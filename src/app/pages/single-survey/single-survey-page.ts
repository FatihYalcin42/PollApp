import { Component, HostListener } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { getAllSurveys } from '../../shared/services/survey-storage.service';
import { type Survey } from '../../shared/interfaces/survey.interface';

type SurveyStats = { total: number; counts: Record<number, number[]> };
type SurveyStatsStore = Record<number, SurveyStats>;
const RESULTS_MOBILE_BREAKPOINT = 740;

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
  protected isResultsOpen = true;
  protected isResultsToggleVisible = false;
  private readonly fallbackSurvey = getAllSurveys()[0];
  private readonly surveyStatsKey = 'pollapp:survey-stats';
  protected survey: Survey = this.fallbackSurvey;

  /**
   * Loads survey data from route changes and restores persisted stats.
   * @param route Activated route instance.
   */
  constructor(private readonly route: ActivatedRoute) {
    this.updateResultsToggleVisibility();
    this.route.paramMap.subscribe((params) => {
      const surveys = getAllSurveys();
      const id = Number(params.get('id'));
      this.survey = surveys.find((item) => item.id === id) ?? surveys[0] ?? this.fallbackSurvey;
      this.selectedAnswers = {};
      this.loadSurveyStats();
    });
  }

  /**
   * Toggles an answer selection for a specific question.
   * @param questionId Question id.
   * @param answerIndex Answer index.
   */
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

  /**
   * Checks whether an answer is currently selected.
   * @param questionId Question id.
   * @param answerIndex Answer index.
   * @returns True if selected.
   */
  protected isAnswerSelected(questionId: number, answerIndex: number): boolean {
    return (this.selectedAnswers[questionId] ?? []).includes(answerIndex);
  }

  /**
   * Converts an answer index to alphabetical label.
   * @param index Zero-based answer index.
   * @returns Letter label.
   */
  protected getAnswerLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  /** Persists current selections as one response and clears the current selection. */
  protected completeSurvey(): void {
    if (!this.hasSelections()) return;
    this.saveSurveyResponse();
    this.selectedAnswers = {};
  }

  /**
   * Calculates projected percentage including current unsaved selection.
   * @param questionId Question id.
   * @param answerIndex Answer index.
   * @returns Rounded percentage value.
   */
  protected getResultPercent(questionId: number, answerIndex: number): number {
    const total = this.getProjectedTotalResponses();
    if (!total) return 0;
    const votes = this.getProjectedVotes(questionId, answerIndex);
    return Math.round((votes / total) * 100);
  }

  /** Toggles results accordion in responsive mode. */
  protected toggleResults(): void {
    if (!this.isResultsToggleVisible) return;
    this.isResultsOpen = !this.isResultsOpen;
  }

  /** Re-evaluates result panel behavior on viewport resize. */
  @HostListener('window:resize')
  protected onWindowResize(): void {
    this.updateResultsToggleVisibility();
  }

  /** @returns True when at least one answer is selected. */
  private hasSelections(): boolean {
    return Object.values(this.selectedAnswers).some((ids) => ids.length > 0);
  }

  /** Saves one completed response to local storage and updates in-memory counters. */
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

  /**
   * Applies selected votes of one question to stats counters.
   * @param stats Mutable stats object.
   * @param questionId Question id.
   * @param answerCount Number of answers in this question.
   */
  private addVotes(stats: SurveyStats, questionId: number, answerCount: number): void {
    const selected = this.selectedAnswers[questionId] ?? [];
    const counts = stats.counts[questionId] ?? Array(answerCount).fill(0);
    selected.forEach((index) => {
      if (index >= 0 && index < counts.length) counts[index] += 1;
    });
    stats.counts[questionId] = counts;
  }

  /** Loads persisted stats for the currently open survey. */
  private loadSurveyStats(): void {
    const stats = this.readSurveyStats()[this.survey.id];
    this.answerCounts = stats?.counts ?? {};
    this.totalResponses = stats?.total ?? 0;
  }

  /** @returns Stored survey statistics map from local storage. */
  private readSurveyStats(): SurveyStatsStore {
    try {
      const raw = localStorage.getItem(this.surveyStatsKey);
      return raw ? (JSON.parse(raw) as SurveyStatsStore) : {};
    } catch {
      return {};
    }
  }

  /** Updates mobile visibility and open state of the results panel. */
  private updateResultsToggleVisibility(): void {
    if (typeof window === 'undefined') {
      this.isResultsToggleVisible = false;
      this.isResultsOpen = true;
      return;
    }
    this.isResultsToggleVisible = window.innerWidth <= RESULTS_MOBILE_BREAKPOINT;
    if (!this.isResultsToggleVisible) this.isResultsOpen = true;
  }

  /** @returns Stored response total plus a projected current vote. */
  private getProjectedTotalResponses(): number {
    return this.totalResponses + (this.hasSelections() ? 1 : 0);
  }

  /**
   * Calculates projected vote count including current unsaved selection.
   * @param questionId Question id.
   * @param answerIndex Answer index.
   * @returns Projected vote count.
   */
  private getProjectedVotes(questionId: number, answerIndex: number): number {
    const baseVotes = this.answerCounts[questionId]?.[answerIndex] ?? 0;
    const selected = this.selectedAnswers[questionId] ?? [];
    return selected.includes(answerIndex) ? baseVotes + 1 : baseVotes;
  }
}
