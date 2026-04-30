import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/public-job-board/public-job-board.component').then(m => m.PublicJobBoardComponent)
  }
];
