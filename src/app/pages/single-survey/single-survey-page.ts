import { ChangeDetectorRef, Component, HostListener, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { type Survey, type SurveyStats } from '../../shared/interfaces/survey.interface';
import {
  getAllSurveys,
  getSurveyStats,
  saveSurveyResponse,
  subscribeToSurveyStats,
} from '../../shared/services/survey-storage.service';

const RESULTS_MOBILE_BREAKPOINT = 740;

@Component({
  selector: 'app-single-survey-page',
  imports: [RouterLink],
  templateUrl: './single-survey-page.html',
  styleUrl: './single-survey-page.scss',
})
export class SingleSurveyPage implements OnDestroy {
  protected selectedAnswers: Record<number, number[]> = {};
  protected totalResponses = 0;
  protected answerCounts: Record<number, number[]> = {};
  protected isResultsOpen = true;
  protected isResultsToggleVisible = false;
  protected survey: Survey | null = null;
  private routeParamSubscription: Subscription | null = null;
  private unsubscribeSurveyStats: (() => void) | null = null;

  /**
   * Loads survey data from route changes and restores persisted stats.
   * @param route Activated route instance.
   */
  constructor(
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.updateResultsToggleVisibility();
    this.routeParamSubscription = this.route.paramMap.subscribe((params) => void this.loadSurveyById(params.get('id')));
  }

  /** Cleans up route and realtime subscriptions when leaving the page. */
  ngOnDestroy(): void {
    this.routeParamSubscription?.unsubscribe();
    this.routeParamSubscription = null;
    this.unsubscribeFromSurveyStats();
  }

  /**
   * Toggles an answer selection for a specific question.
   * @param questionId Question id.
   * @param answerIndex Answer index.
   */
  protected toggleAnswer(questionId: number, answerIndex: number): void {
    if (!this.survey) return;
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
  protected async completeSurvey(): Promise<void> {
    if (!this.survey || !this.hasSelections()) return;
    const stats = await saveSurveyResponse(this.survey.id, this.survey.questions, this.selectedAnswers);
    this.applyStats(stats);
    this.selectedAnswers = {};
  }

  /**
   * Calculates projected percentage including current unsaved selection.
   * @param questionId Question id.
   * @param answerIndex Answer index.
   * @returns Rounded percentage value.
   */
  protected getResultPercent(questionId: number, answerIndex: number): number {
    if (!this.survey) return 0;
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

  /**
   * Loads survey by route id and then fetches stored stats.
   * @param idParam Survey id route param.
   */
  private async loadSurveyById(idParam: string | null): Promise<void> {
    const id = Number(idParam);
    const surveys = await getAllSurveys();
    if (!surveys.length) {
      this.clearStateForMissingSurvey();
      return;
    }
    this.survey = surveys.find((item) => item.id === id) ?? surveys[0];
    this.selectedAnswers = {};
    this.subscribeToCurrentSurveyStats();
    await this.loadSurveyStats();
    this.cdr.detectChanges();
  }

  /** Loads persisted stats for the currently open survey. */
  private async loadSurveyStats(): Promise<void> {
    if (!this.survey) return;
    this.applyStats(await getSurveyStats(this.survey.id));
  }

  /**
   * Applies current stats values to component state.
   * @param stats Survey stats object.
   */
  private applyStats(stats: SurveyStats): void {
    this.answerCounts = stats.counts;
    this.totalResponses = stats.total;
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

  /** Subscribes to realtime stats updates for the currently loaded survey. */
  private subscribeToCurrentSurveyStats(): void {
    this.unsubscribeFromSurveyStats();
    if (!this.survey) return;
    this.unsubscribeSurveyStats = subscribeToSurveyStats(this.survey.id, (stats) => {
      this.applyStats(stats);
      this.cdr.detectChanges();
    });
  }

  /** Unsubscribes from the active survey stats realtime listener. */
  private unsubscribeFromSurveyStats(): void {
    this.unsubscribeSurveyStats?.();
    this.unsubscribeSurveyStats = null;
  }

  /** Clears component state if no matching survey could be resolved. */
  private clearStateForMissingSurvey(): void {
    this.survey = null;
    this.selectedAnswers = {};
    this.answerCounts = {};
    this.totalResponses = 0;
    this.unsubscribeFromSurveyStats();
    this.cdr.detectChanges();
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
