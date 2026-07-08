import { Routes } from '@angular/router';
import { authGuard, adminGuard, repartidorGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(c => c.LoginComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./layout/admin-layout/admin-layout.component').then(c => c.AdminLayoutComponent),
    canActivate: [authGuard, adminGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(c => c.AdminDashboardComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./features/admin/products/products.component').then(c => c.AdminProductsComponent)
      },
      {
        path: 'inventory',
        loadComponent: () => import('./features/admin/inventory/inventory.component').then(c => c.AdminInventoryComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/admin/reports/reports.component').then(c => c.AdminReportsComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users/users.component').then(c => c.AdminUsersComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'repartidor',
    loadComponent: () => import('./layout/repartidor-layout/repartidor-layout.component').then(c => c.RepartidorLayoutComponent),
    canActivate: [authGuard, repartidorGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/repartidor/dashboard/dashboard.component').then(c => c.RepartidorDashboardComponent)
      },
      {
        path: 'sales',
        loadComponent: () => import('./features/repartidor/sales/sales.component').then(c => c.RepartidorSalesComponent)
      },
      {
        path: 'closure',
        loadComponent: () => import('./features/repartidor/closure/closure.component').then(c => c.RepartidorClosureComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
