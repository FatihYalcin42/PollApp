import { Routes } from '@angular/router';
import { CreateSurveyPage } from './pages/create-survey/create-survey-page';
import { HomePage } from './pages/home/home-page';
import { SingleSurveyPage } from './pages/single-survey/single-survey-page';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'create-survey', component: CreateSurveyPage },
  { path: 'single-survey', component: SingleSurveyPage },
  { path: '**', redirectTo: '' },
];
