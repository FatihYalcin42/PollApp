import { Component } from '@angular/core';
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
  private readonly activeByDate = this.surveys.filter((survey) => survey.daysLeft > 0);
  private readonly pastByDate = this.surveys.filter((survey) => survey.daysLeft <= 0);
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

  private repeatToLength(items: Survey[], size: number): Survey[] {
    if (!items.length || size < 1) return [];
    return Array.from({ length: size }, (_, i) => items[i % items.length]);
  }
}
