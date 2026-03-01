import { Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';

type RemovableInput = 'surveyName' | 'endDate' | 'description' | 'question';

@Component({
  selector: 'app-create-survey-page',
  imports: [RouterLink],
  templateUrl: './create-survey-page.html',
  styleUrl: './create-survey-page.scss',
})
export class CreateSurveyPage {
  protected isCategoryDropdownOpen = false;
  protected visibleInputs: Record<RemovableInput, boolean> = {
    surveyName: true,
    endDate: true,
    description: true,
    question: true,
  };
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

  @HostListener('document:click', ['$event'])
  protected closeCategoryDropdownOnOutsideClick(event: MouseEvent): void {
    if (!this.isCategoryDropdownOpen) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.category-dropdown')) this.isCategoryDropdownOpen = false;
  }

  protected selectCategory(category: string): void {
    this.selectedCategory = category;
    this.isCategoryDropdownOpen = false;
  }

  protected removeInput(input: RemovableInput): void {
    this.visibleInputs[input] = false;
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
