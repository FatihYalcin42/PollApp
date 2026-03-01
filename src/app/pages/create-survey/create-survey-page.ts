import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-create-survey-page',
  imports: [RouterLink],
  templateUrl: './create-survey-page.html',
  styleUrl: './create-survey-page.scss',
})
export class CreateSurveyPage {
  protected isCategoryDropdownOpen = false;
  protected selectedCategory = 'Choose categorie';
  protected readonly categories = [
    'Team Activities',
    'Health & Wellness',
    'Gaming & Entertainment',
    'Education & Learning',
    'Lifestyle & Preferences',
    'Technology & Innovation',
  ];
  protected readonly maxAnswerFields = 6;
  protected answerFieldIndexes = [0, 1];

  protected toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }

  protected selectCategory(category: string): void {
    this.selectedCategory = category;
    this.isCategoryDropdownOpen = false;
  }

  protected addAnswerField(): void {
    if (this.answerFieldIndexes.length >= this.maxAnswerFields) {
      return;
    }

    const nextIndex = this.answerFieldIndexes.length
      ? Math.max(...this.answerFieldIndexes) + 1
      : 0;
    this.answerFieldIndexes = [...this.answerFieldIndexes, nextIndex];
  }

  protected removeAnswerField(answerFieldIndex: number): void {
    this.answerFieldIndexes = this.answerFieldIndexes.filter(
      (index) => index !== answerFieldIndex,
    );
  }

  protected getAnswerLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }
}
