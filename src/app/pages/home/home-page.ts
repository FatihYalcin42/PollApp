import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type ActiveSurvey = { category: string; title: string; endsIn: string };

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  protected readonly activeSurveys = this.repeatToLength(
    [
      { category: 'Team activities', title: "Let's Plan the Next Team Event Together", endsIn: 'Ends in 1 Day' },
      { category: 'Gaming', title: 'Gaming habits and favorite games!', endsIn: 'Ends in 3 Day' },
      { category: 'Healthy Lifestyle', title: 'Healthier future: Fit & wellness survey!', endsIn: 'Ends in 2 Day' },
    ],
    6,
  );

  private repeatToLength(items: ActiveSurvey[], size: number): ActiveSurvey[] {
    if (!items.length || size < 1) return [];
    return Array.from({ length: size }, (_, i) => items[i % items.length]);
  }
}
