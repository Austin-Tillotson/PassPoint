import { Routes } from '@angular/router';

import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { GeneralLayout } from './layouts/general-layout/general-layout';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: '',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login').then((module) => module.Login),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register').then((module) => module.Register),
      },
    ],
  },
  {
    path: '',
    component: GeneralLayout,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((module) => module.Dashboard),
      },
      {
        path: 'password-generator',
        loadComponent: () =>
          import('./features/password-generator/password-generator').then(
            (module) => module.PasswordGenerator,
          ),
      },
    ],
  },
];