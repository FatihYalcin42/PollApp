import { Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SURVEYS, type Survey } from '../../data/surveys';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly surveys = SURVEYS;
  protected isPastView = false;
  protected isSortMenuOpen = false;
  protected selectedSortCategory = '';
  private readonly activeByDate = this.surveys.filter((survey) => survey.daysLeft > 0);
  private readonly pastByDate = this.surveys.filter((survey) => survey.daysLeft <= 0);
  protected readonly sortCategories = [...new Set(this.surveys.map((survey) => survey.category))];
  protected readonly activeSurveys = this.repeatToLength(
    this.activeByDate,
    Math.max(6, this.activeByDate.length),
  );
  protected readonly pastSurveys = this.repeatToLength(
    this.pastByDate,
    Math.max(6, this.pastByDate.length),
  );
  protected readonly endingSoonSurveys = this.repeatToLength(
    this.activeByDate.filter((survey) => survey.daysLeft <= 7),
    3,
  );

  @HostListener('document:click', ['$event'])
  protected closeSortMenuOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.sort-menu')) this.isSortMenuOpen = false;
  }

  protected get visibleSurveys(): Survey[] {
    const list = this.isPastView ? this.pastSurveys : this.activeSurveys;
    if (!this.selectedSortCategory) return list;
    return list.filter((survey) => survey.category === this.selectedSortCategory);
  }

  private repeatToLength(items: Survey[], size: number): Survey[] {
    if (!items.length || size < 1) return [];
    return Array.from({ length: size }, (_, i) => items[i % items.length]);
  }
}
