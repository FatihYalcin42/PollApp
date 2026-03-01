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
  protected readonly maxAnswerFields = 6;
  protected answerFieldIndexes = [0, 1];

  protected toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }

  protected addAnswerField(): void {
    if (this.answerFieldIndexes.length >= this.maxAnswerFields) {
      return;
    }

    const nextIndex = this.answerFieldIndexes.length;
    this.answerFieldIndexes = [...this.answerFieldIndexes, nextIndex];
  }

  protected getAnswerLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }
}
