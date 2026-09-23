import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login)
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard)
      },
      {
        path: 'devices',
        loadComponent: () => import('./features/devices/devices').then((m) => m.Devices)
      },
      {
        path: 'logs',
        loadComponent: () => import('./features/logs/logs').then((m) => m.Logs)
      },
      {
        path: 'attendance',
        loadComponent: () => import('./features/attendance/attendance').then((m) => m.Attendance)
      },
      {
        path: 'attendance-upload',
        loadComponent: () =>
          import('./features/attendance-upload/attendance-upload').then((m) => m.AttendanceUpload)
      },
      {
        path: 'resync',
        loadComponent: () => import('./features/resync/resync').then((m) => m.Resync)
      },
      {
        path: 'device-users',
        loadComponent: () => import('./features/device-users/device-users').then((m) => m.DeviceUsers)
      },
      {
        path: 'setup-guide',
        loadComponent: () => import('./features/setup-guide/setup-guide').then((m) => m.SetupGuide)
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
