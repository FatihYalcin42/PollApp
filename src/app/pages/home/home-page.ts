import { Component, HostListener, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getAllSurveys } from '../../shared/services/survey-storage.service';
import { type Survey } from '../../shared/interfaces/survey.interface';

const SURVEY_CREATED_OVERLAY_KEY = 'pollapp:survey-created-overlay';
const CREATED_OVERLAY_TIMEOUT_MS = 3200;

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit {
  protected isPastView = false;
  protected isSortMenuOpen = false;
  protected selectedSortCategory = '';
  protected showCreatedOverlay = false;
  protected surveys: Survey[] = [];

  /** Shows the "created survey" overlay once after redirect from create flow. */
  ngOnInit(): void {
    void this.loadSurveys();
    this.handleCreatedOverlay();
  }

  /** Shows the "created survey" overlay once after redirect from create flow. */
  private handleCreatedOverlay(): void {
    if (localStorage.getItem(SURVEY_CREATED_OVERLAY_KEY) !== '1') return;
    this.showCreatedOverlay = true;
    localStorage.removeItem(SURVEY_CREATED_OVERLAY_KEY);
    window.setTimeout(() => (this.showCreatedOverlay = false), CREATED_OVERLAY_TIMEOUT_MS);
  }

  /** Loads surveys from configured storage backend. */
  private async loadSurveys(): Promise<void> {
    this.surveys = this.sortByDays(await getAllSurveys());
  }

  /** Closes the created-survey overlay manually. */
  protected closeCreatedOverlay(): void {
    this.showCreatedOverlay = false;
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
