import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si está cargando la sesión, esperamos
  if (authService.loading()) {
    // Para simplificar, si está inicializando esperamos un momento o dejamos pasar, 
    // pero idealmente validamos si isAuthenticated() es verdadero.
    // Usamos una promesa sencilla para esperar a que termine de cargar
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (!authService.loading()) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const adminGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Esperar a que cargue la sesión
  if (authService.loading()) {
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (!authService.loading()) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  }

  if (authService.isAuthenticated() && authService.isAdmin()) {
    return true;
  }

  if (authService.isAuthenticated()) {
    router.navigate(['/repartidor']);
    return false;
  }

  router.navigate(['/login']);
  return false;
};

export const repartidorGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Esperar a que cargue la sesión
  if (authService.loading()) {
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (!authService.loading()) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  }

  if (authService.isAuthenticated() && authService.isRepartidor()) {
    return true;
  }

  if (authService.isAuthenticated()) {
    router.navigate(['/admin']);
    return false;
  }

  router.navigate(['/login']);
  return false;
};
