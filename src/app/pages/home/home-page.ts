import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getAllSurveys, subscribeToSurveyChanges } from '../../shared/services/survey-storage.service';
import { type Survey } from '../../shared/interfaces/survey.interface';
import { CreateSurveyPage } from '../create-survey/create-survey-page';
import { SURVEY_CATEGORIES } from '../../shared/constants/survey-categories';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, CreateSurveyPage],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit, OnDestroy {
  protected isCreatedOverlayVisible = false;
  protected isCreateSurveyDialogOpen = false;
  protected isPastView = false;
  protected isSortMenuOpen = false;
  protected selectedSortCategory = '';
  protected surveys: Survey[] = [];
  private unsubscribeSurveyChanges: (() => void) | null = null;
  private createdOverlayTimeoutId: ReturnType<typeof setTimeout> | null = null;

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
    this.clearCreatedOverlayTimer();
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

  /** Shows "survey created" overlay and closes the dialog. */
  protected handleSurveyPublished(): void {
    this.isCreatedOverlayVisible = true;
    this.closeCreateSurveyDialog();
    this.startCreatedOverlayTimer();
  }

  /** Hides the "survey created" overlay immediately. */
  protected hideCreatedOverlay(): void {
    this.isCreatedOverlayVisible = false;
    this.clearCreatedOverlayTimer();
  }

  /** Closes create survey dialog on Escape key. */
  @HostListener('document:keydown.escape')
  protected closeCreateSurveyDialogOnEscape(): void {
    if (!this.isCreateSurveyDialogOpen) return;
    this.closeCreateSurveyDialog();
  }

  /** @returns Shared category names shown in home filter dropdown. */
  protected get sortCategories(): string[] {
    return [...SURVEY_CATEGORIES];
  }

  /** @returns All surveys that are still active. */
  protected get activeSurveys(): Survey[] {
    const active = this.surveys.filter((survey) => survey.daysLeft > 0);
    return this.filterByCategory(active);
  }

  /** @returns All surveys that are already finished. */
  protected get pastSurveys(): Survey[] {
    const past = this.surveys.filter((survey) => survey.daysLeft <= 0);
    return this.filterByCategory(past);
  }

  /** @returns Up to three active surveys with the nearest end date. */
  protected get endingSoonSurveys(): Survey[] {
    return this.activeSurveys.slice(0, 3);
  }

  /** @returns Active or past surveys based on the selected tab. */
  protected get visibleSurveys(): Survey[] {
    return this.isPastView ? this.pastSurveys : this.activeSurveys;
  }

  /**
   * Sorts surveys by remaining days until deadline.
   * @param items Survey list to sort.
   * @returns Sorted survey list.
   */
  private sortByDays(items: Survey[]): Survey[] {
    return [...items].sort((a, b) => a.daysLeft - b.daysLeft);
  }

  /**
   * Filters a survey list by selected category.
   * @param items Survey list to filter.
   * @returns Original list or category-filtered list.
   */
  private filterByCategory(items: Survey[]): Survey[] {
    if (!this.selectedSortCategory) return items;
    return items.filter((survey) => survey.category === this.selectedSortCategory);
  }

  /** Starts auto-hide timer for the created overlay. */
  private startCreatedOverlayTimer(): void {
    this.clearCreatedOverlayTimer();
    this.createdOverlayTimeoutId = setTimeout(() => {
      this.isCreatedOverlayVisible = false;
      this.createdOverlayTimeoutId = null;
      this.cdr.detectChanges();
    }, 3000);
  }

  /** Clears running created overlay timer. */
  private clearCreatedOverlayTimer(): void {
    if (!this.createdOverlayTimeoutId) return;
    clearTimeout(this.createdOverlayTimeoutId);
    this.createdOverlayTimeoutId = null;
  }
}
