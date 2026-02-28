import { Component } from '@angular/core';

@Component({
  selector: 'app-create-survey-page',
  templateUrl: './create-survey-page.html',
  styleUrl: './create-survey-page.scss',
})
export class CreateSurveyPage {
  protected isCategoryDropdownOpen = false;

  protected toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }
}
