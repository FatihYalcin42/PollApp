import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type ActiveSurvey = { category: string; title: string; daysLeft: number };

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly surveys: ActiveSurvey[] = [
    { category: 'Team activities', title: "Let's Plan the Next Team Event Together", daysLeft: 1 },
    { category: 'Gaming', title: 'Gaming habits and favorite games!', daysLeft: 3 },
    { category: 'Healthy Lifestyle', title: 'Healthier future: Fit & wellness survey!', daysLeft: 2 },
    { category: 'Education & Learning', title: 'Learning Friday sessions feedback', daysLeft: 6 },
    { category: 'Technology & Innovation', title: 'AI tools at work survey', daysLeft: 7 },
    { category: 'Workplace Culture', title: 'Office wellbeing pulse', daysLeft: 10 },
    { category: 'Social & Events', title: 'After-work hangout preferences', daysLeft: 12 },
    { category: 'Food & Drinks', title: 'Team lunch and snacks survey', daysLeft: 14 },
  ];
  protected readonly activeSurveys = this.repeatToLength(
    this.surveys,
    Math.max(6, this.surveys.length),
  );
  protected readonly endingSoonSurveys = this.repeatToLength(
    this.surveys.filter((survey) => survey.daysLeft <= 7),
    3,
  );

  private repeatToLength(items: ActiveSurvey[], size: number): ActiveSurvey[] {
    if (!items.length || size < 1) return [];
    return Array.from({ length: size }, (_, i) => items[i % items.length]);
  }
}
