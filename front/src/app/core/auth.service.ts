import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_URL } from './config';
import { AuthResponse, RegisterData, RoleName, SessionUser } from './models';

const TOKEN_KEY = 'itcare_token';
const USER_KEY = 'itcare_user';

/** Session de l'utilisateur : token JWT + infos (rôles) conservés dans le localStorage. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly tokenSignal = signal<string | null>(this.loadToken());
  readonly user = signal<SessionUser | null>(this.loadUser());

  readonly token = this.tokenSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.tokenSignal() && !!this.user());
  readonly isAdmin = computed(() => this.user()?.roles.includes('ADMIN') ?? false);

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/login`, { email, password })
      .pipe(tap((res) => this.store(res)));
  }

  register(data: RegisterData): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/auth/register`, data);
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/auth/reset-password`, { token, newPassword });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenSignal.set(null);
    this.user.set(null);
  }

  /** Met à jour le nom affiché après une modification du profil. */
  updateSessionUser(patch: Partial<SessionUser>): void {
    const current = this.user();
    if (!current) {
      return;
    }
    const next = { ...current, ...patch };
    localStorage.setItem(USER_KEY, JSON.stringify(next));
    this.user.set(next);
  }

  hasAnyRole(roles: RoleName[]): boolean {
    const mine = this.user()?.roles ?? [];
    return roles.some((r) => mine.includes(r));
  }

  /** Page d'accueil selon le rôle : l'Admin voit le tableau de bord, le Collaborateur la liste des incidents. */
  homeUrl(): string {
    return this.isAdmin() ? '/dashboard' : '/incidents';
  }

  private store(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.tokenSignal.set(res.token);
    this.user.set(res.user);
  }

  private loadToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    return token && !this.isExpired(token) ? token : null;
  }

  private loadUser(): SessionUser | null {
    if (!this.loadToken()) {
      return null;
    }
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as SessionUser | null;
    } catch {
      return null;
    }
  }

  /** Lit la date d'expiration (claim "exp") du JWT, sans vérifier la signature (le back s'en charge). */
  private isExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}
