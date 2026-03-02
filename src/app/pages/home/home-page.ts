import { Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getAllSurveys } from '../../data/survey-storage';
import { type Survey } from '../../data/surveys';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly surveys = getAllSurveys();
  protected isPastView = false;
  protected isSortMenuOpen = false;
  protected selectedSortCategory = '';
  private readonly activeByDate = this.sortByDays(this.surveys.filter((survey) => survey.daysLeft > 0));
  private readonly pastByDate = this.sortByDays(this.surveys.filter((survey) => survey.daysLeft <= 0));
  protected readonly sortCategories = [...new Set(this.surveys.map((survey) => survey.category))];
  protected readonly activeSurveys = this.activeByDate;
  protected readonly pastSurveys = this.pastByDate;
  protected readonly endingSoonSurveys = this.activeByDate.slice(0, 3);

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

  private sortByDays(items: Survey[]): Survey[] {
    return [...items].sort((a, b) => a.daysLeft - b.daysLeft);
  }
}
