import { Component, HostListener, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getAllSurveys } from '../../shared/services/survey-storage.service';
import { type Survey } from '../../shared/interfaces/survey.interface';

const SURVEY_CREATED_OVERLAY_KEY = 'pollapp:survey-created-overlay';

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

  ngOnInit(): void {
    if (localStorage.getItem(SURVEY_CREATED_OVERLAY_KEY) !== '1') return;
    this.showCreatedOverlay = true;
    localStorage.removeItem(SURVEY_CREATED_OVERLAY_KEY);
    window.setTimeout(() => (this.showCreatedOverlay = false), 3200);
  }

  protected closeCreatedOverlay(): void {
    this.showCreatedOverlay = false;
  }

  @HostListener('document:click', ['$event'])
  protected closeSortMenuOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.sort-menu')) this.isSortMenuOpen = false;
  }

  protected get sortCategories(): string[] {
    return [...new Set(this.surveys.map((survey) => survey.category))];
  }

  protected get activeSurveys(): Survey[] {
    return this.surveys.filter((survey) => survey.daysLeft > 0);
  }

  protected get pastSurveys(): Survey[] {
    return this.surveys.filter((survey) => survey.daysLeft <= 0);
  }

  protected get endingSoonSurveys(): Survey[] {
    return this.activeSurveys.slice(0, 3);
  }

  protected get visibleSurveys(): Survey[] {
    const list = this.isPastView ? this.pastSurveys : this.activeSurveys;
    if (!this.selectedSortCategory) return list;
    return list.filter((survey) => survey.category === this.selectedSortCategory);
  }

  private get surveys(): Survey[] {
    return this.sortByDays(getAllSurveys());
  }

  private sortByDays(items: Survey[]): Survey[] {
    return [...items].sort((a, b) => a.daysLeft - b.daysLeft);
  }
}
