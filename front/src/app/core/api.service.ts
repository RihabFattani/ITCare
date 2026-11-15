import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import {
  AppNotification,
  Client,
  Incident,
  IncidentComment,
  IncidentEvent,
  IncidentFilters,
  Role,
  Statut,
  Stats,
  User,
  UserPayload,
} from './models';

/** Construit des paramètres d'URL en ignorant les valeurs vides. */
function toParams(values: Record<string, string | number | null | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && `${value}`.trim() !== '') {
      params = params.set(key, `${value}`.trim());
    }
  }
  return params;
}

/** /api/clients : les formulaires avec logo sont envoyés en FormData (multipart). */
@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/clients`;

  list(q?: string, activite?: string): Observable<Client[]> {
    return this.http.get<Client[]>(this.url, { params: toParams({ q, activite }) });
  }

  get(id: number | string): Observable<Client> {
    return this.http.get<Client>(`${this.url}/${id}`);
  }

  create(form: FormData): Observable<Client> {
    return this.http.post<Client>(this.url, form);
  }

  update(id: number | string, form: FormData): Observable<Client> {
    return this.http.put<Client>(`${this.url}/${id}`, form);
  }

  removePhoto(id: number | string): Observable<Client> {
    return this.http.delete<Client>(`${this.url}/${id}/photo`);
  }

  delete(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

/** /api/incidents */
@Injectable({ providedIn: 'root' })
export class IncidentService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/incidents`;

  list(filters: IncidentFilters = {}): Observable<Incident[]> {
    return this.http.get<Incident[]>(this.url, {
      params: toParams({
        q: filters.q,
        statut: filters.statut,
        priorite: filters.priorite,
        clientId: filters.clientId,
      }),
    });
  }

  get(id: number | string): Observable<Incident> {
    return this.http.get<Incident>(`${this.url}/${id}`);
  }

  create(form: FormData): Observable<Incident> {
    return this.http.post<Incident>(this.url, form);
  }

  update(id: number | string, form: FormData): Observable<Incident> {
    return this.http.put<Incident>(`${this.url}/${id}`, form);
  }

  changeStatut(id: number | string, statut: Statut): Observable<Incident> {
    return this.http.patch<Incident>(`${this.url}/${id}/statut`, null, { params: { statut } });
  }

  /** Replanification (Admin) : value = date locale ISO, ex. 2026-11-20T14:00 */
  reschedule(id: number | string, value: string): Observable<Incident> {
    return this.http.patch<Incident>(`${this.url}/${id}/echeance`, null, { params: { value } });
  }

  assign(id: number | string, userId: number | string): Observable<Incident> {
    return this.http.patch<Incident>(`${this.url}/${id}/assignee`, null, { params: { userId } });
  }

  comments(id: number | string): Observable<IncidentComment[]> {
    return this.http.get<IncidentComment[]>(`${this.url}/${id}/comments`);
  }

  addComment(id: number | string, contenu: string): Observable<IncidentComment> {
    return this.http.post<IncidentComment>(`${this.url}/${id}/comments`, { contenu });
  }

  history(id: number | string): Observable<IncidentEvent[]> {
    return this.http.get<IncidentEvent[]>(`${this.url}/${id}/history`);
  }

  uploadRapport(id: number | string, file: File): Observable<Incident> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Incident>(`${this.url}/${id}/rapport`, form);
  }

  removeRapport(id: number | string): Observable<Incident> {
    return this.http.delete<Incident>(`${this.url}/${id}/rapport`);
  }

  delete(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

/** /api/users et /api/roles (réservés à l'Admin) */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/users`;

  list(): Observable<User[]> {
    return this.http.get<User[]>(this.url);
  }

  get(id: number | string): Observable<User> {
    return this.http.get<User>(`${this.url}/${id}`);
  }

  create(user: UserPayload): Observable<User> {
    return this.http.post<User>(this.url, user);
  }

  update(id: number | string, user: UserPayload): Observable<User> {
    return this.http.put<User>(`${this.url}/${id}`, user);
  }

  setEnabled(id: number, value: boolean): Observable<User> {
    return this.http.patch<User>(`${this.url}/${id}/enabled`, null, { params: { value } });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  roles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${API_URL}/roles`);
  }
}

/** /api/stats : données du tableau de bord (Admin) */
@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);

  get(): Observable<Stats> {
    return this.http.get<Stats>(`${API_URL}/stats`);
  }
}

/** /api/account : paramètres du compte de l'utilisateur connecté (tous rôles) */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/account`;

  me(): Observable<User> {
    return this.http.get<User>(this.url);
  }

  updateProfile(data: { nom: string; prenom: string; tel: string }): Observable<User> {
    return this.http.put<User>(this.url, data);
  }

  uploadPhoto(file: File): Observable<User> {
    const data = new FormData();
    data.append('photo', file);
    return this.http.post<User>(`${this.url}/photo`, data);
  }

  removePhoto(): Observable<User> {
    return this.http.delete<User>(`${this.url}/photo`);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.url}/password`, { currentPassword, newPassword });
  }
}

/** /api/notifications : cloche de l'utilisateur connecté */
@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/notifications`;

  list(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(this.url);
  }

  read(id: number): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.url}/${id}/read`, null);
  }

  readAll(): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.url}/read-all`, null);
  }
}
