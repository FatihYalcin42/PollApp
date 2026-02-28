import { Routes } from '@angular/router';
import { CreateSurveyPage } from './pages/create-survey/create-survey-page';
import { HomePage } from './pages/home/home-page';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'create-survey', component: CreateSurveyPage },
  { path: '**', redirectTo: '' },
];
