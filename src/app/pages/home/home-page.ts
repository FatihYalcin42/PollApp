import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getAllSurveys, subscribeToSurveyChanges } from '../../shared/services/survey-storage.service';
import { type Survey } from '../../shared/interfaces/survey.interface';
import { CreateSurveyPage } from '../create-survey/create-survey-page';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, CreateSurveyPage],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit, OnDestroy {
  protected isCreateSurveyDialogOpen = false;
  protected isPastView = false;
  protected isSortMenuOpen = false;
  protected selectedSortCategory = '';
  protected surveys: Survey[] = [];
  private unsubscribeSurveyChanges: (() => void) | null = null;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  /** Loads surveys and subscribes to realtime list changes. */
  ngOnInit(): void {
    this.unsubscribeSurveyChanges = subscribeToSurveyChanges((surveys) => {
      this.surveys = this.sortByDays(surveys);
      this.cdr.detectChanges();
    });
    void this.loadSurveys();
  }

  /** Cleans up active realtime subscriptions when leaving the page. */
  ngOnDestroy(): void {
    this.unsubscribeSurveyChanges?.();
    this.unsubscribeSurveyChanges = null;
  }

  /** Loads surveys from configured storage backend. */
  private async loadSurveys(): Promise<void> {
    this.surveys = this.sortByDays(await getAllSurveys());
    this.cdr.detectChanges();
  }

  /**
   * Closes sort dropdown when clicking outside.
   * @param event Native click event.
   */
  @HostListener('document:click', ['$event'])
  protected closeSortMenuOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.sort-menu')) this.isSortMenuOpen = false;
  }

  /** Opens the create survey dialog overlay. */
  protected openCreateSurveyDialog(): void {
    this.isCreateSurveyDialogOpen = true;
  }

  /** Closes the create survey dialog overlay. */
  protected closeCreateSurveyDialog(): void {
    this.isCreateSurveyDialogOpen = false;
  }

  /** Closes create survey dialog on Escape key. */
  @HostListener('document:keydown.escape')
  protected closeCreateSurveyDialogOnEscape(): void {
    if (!this.isCreateSurveyDialogOpen) return;
    this.closeCreateSurveyDialog();
  }

  /** @returns Distinct category names from all surveys. */
  protected get sortCategories(): string[] {
    return [...new Set(this.surveys.map((survey) => survey.category))];
  }

  /** @returns All surveys that are still active. */
  protected get activeSurveys(): Survey[] {
    return this.surveys.filter((survey) => survey.daysLeft > 0);
  }

  /** @returns All surveys that are already finished. */
  protected get pastSurveys(): Survey[] {
    return this.surveys.filter((survey) => survey.daysLeft <= 0);
  }

  /** @returns Up to three active surveys with the nearest end date. */
  protected get endingSoonSurveys(): Survey[] {
    return this.activeSurveys.slice(0, 3);
  }

  /** @returns Active or past surveys, optionally filtered by category. */
  protected get visibleSurveys(): Survey[] {
    const list = this.isPastView ? this.pastSurveys : this.activeSurveys;
    if (!this.selectedSortCategory) return list;
    return list.filter((survey) => survey.category === this.selectedSortCategory);
  }

  /**
   * Sorts surveys by remaining days until deadline.
   * @param items Survey list to sort.
   * @returns Sorted survey list.
   */
  private sortByDays(items: Survey[]): Survey[] {
    return [...items].sort((a, b) => a.daysLeft - b.daysLeft);
  }
}
