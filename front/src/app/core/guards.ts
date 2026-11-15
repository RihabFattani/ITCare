import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { NotificationService } from '../shared/notification';
import { AuthService } from './auth.service';
import { RoleName } from './models';

/** Protège les pages : il faut être connecté, sinon redirection vers /login. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Pages réservées aux visiteurs (login, register) : un utilisateur connecté est renvoyé vers son accueil. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? router.createUrlTree([auth.homeUrl()]) : true;
};

/** Protège selon le rôle : la route déclare data: { roles: ['ADMIN'] }. */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = (route.data['roles'] ?? []) as RoleName[];
  if (auth.hasAnyRole(roles)) {
    return true;
  }
  inject(NotificationService).error("Accès refusé : cette page est réservée à l'administrateur.");
  return router.createUrlTree([auth.homeUrl()]);
};
