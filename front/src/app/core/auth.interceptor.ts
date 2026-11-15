import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../shared/notification';
import { AuthService } from './auth.service';
import { API_URL } from './config';

/**
 * Interceptor HTTP :
 *  1. ajoute "Authorization: Bearer <token>" à chaque requête vers l'API ;
 *  2. 401 (token absent/expiré) -> déconnexion et retour à la page de login ;
 *  3. 403 (rôle insuffisant) -> notification "Accès refusé".
 * Les erreurs de /auth/* (mauvais mot de passe, compte non activé) sont affichées par les formulaires eux-mêmes.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);

  const isApi = req.url.startsWith(API_URL);
  const isAuthCall = req.url.startsWith(`${API_URL}/auth/`);
  const token = auth.token();
  const authReq = isApi && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (isApi && !isAuthCall) {
        if (err.status === 401) {
          auth.logout();
          notifications.error('Session expirée ou invalide : veuillez vous reconnecter.');
          router.navigate(['/login']);
        } else if (err.status === 403) {
          notifications.error("Accès refusé : vous n'avez pas les droits nécessaires.");
        }
      }
      return throwError(() => err);
    }),
  );
};
