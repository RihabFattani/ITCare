import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { User } from '../core/models';
import { errorMessage } from '../core/utils';
import { NotificationService } from '../shared/notification';

/** Gestion des utilisateurs (Admin) : CRUD et activation des comptes. */
@Component({
  selector: 'app-user-list',
  imports: [RouterLink],
  template: `
    <div class="header bg-gradient-primary pb-8 pt-5 pt-md-8">
      <div class="container-fluid">
        <div class="header-body">
          <h1 class="text-white mb-0">Gestion des utilisateurs</h1>
          <p class="text-white-50 mb-0">Créez les comptes, attribuez les rôles et activez les inscriptions.</p>
        </div>
      </div>
    </div>

    <div class="container-fluid mt--7">
      <div class="card shadow">
        <div class="card-header border-0">
          <div class="row align-items-center">
            <div class="col">
              <h3 class="mb-0">Utilisateurs ({{ users().length }})</h3>
              @if (pending() > 0) {
                <small class="text-warning">{{ pending() }} compte(s) en attente d'activation</small>
              }
            </div>
            <div class="col text-right">
              <a routerLink="/users/new" class="btn btn-sm btn-primary">
                <i class="fas fa-plus mr-1"></i> Nouvel utilisateur
              </a>
            </div>
          </div>
        </div>

        @if (error()) {
          <div class="alert alert-danger mx-4">{{ error() }}</div>
        }

        <div class="table-responsive">
          <table class="table align-items-center table-flush">
            <thead class="thead-light">
              <tr>
                <th scope="col">Utilisateur</th>
                <th scope="col">Email</th>
                <th scope="col">Téléphone</th>
                <th scope="col">Rôles</th>
                <th scope="col">Compte</th>
                <th scope="col" class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr>
                  <th scope="row">
                    {{ u.prenom }} {{ u.nom }}
                    @if (isMe(u)) { <span class="badge badge-light ml-1">vous</span> }
                  </th>
                  <td>{{ u.email }}</td>
                  <td>{{ u.tel || '-' }}</td>
                  <td>
                    @for (r of u.roles; track r.id) {
                      <span class="badge badge-pill mr-1"
                            [class]="r.libelle === 'ADMIN' ? 'badge-primary' : 'badge-info'">{{ r.libelle }}</span>
                    }
                  </td>
                  <td>
                    <span class="badge badge-pill" [class]="u.enabled ? 'badge-success' : 'badge-warning'">
                      {{ u.enabled ? 'Actif' : 'En attente' }}
                    </span>
                  </td>
                  <td class="text-right text-nowrap">
                    @if (!isMe(u)) {
                      <button type="button" class="btn btn-sm"
                              [class]="u.enabled ? 'btn-outline-secondary' : 'btn-success'"
                              (click)="toggle(u)">
                        {{ u.enabled ? 'Désactiver' : 'Activer' }}
                      </button>
                    }
                    <a [routerLink]="['/users', u.id, 'edit']" class="btn btn-sm btn-outline-warning"
                       title="Modifier"><i class="fas fa-edit"></i></a>
                    @if (!isMe(u)) {
                      <button type="button" class="btn btn-sm btn-outline-danger" title="Supprimer"
                              (click)="remove(u)"><i class="fas fa-trash"></i></button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="text-center text-muted py-5">Aucun utilisateur.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class UserList {
  private readonly auth = inject(AuthService);
  private readonly service = inject(UserService);
  private readonly notifications = inject(NotificationService);

  protected readonly users = signal<User[]>([]);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected pending(): number {
    return this.users().filter((u) => !u.enabled).length;
  }

  protected isMe(user: User): boolean {
    return user.id === this.auth.user()?.id;
  }

  protected toggle(user: User): void {
    this.service.setEnabled(user.id, !user.enabled).subscribe({
      next: (updated) => {
        this.notifications.success(`Compte de ${updated.email} ${updated.enabled ? 'activé' : 'désactivé'}.`);
        this.load();
      },
      error: (err) => this.notifications.error(errorMessage(err)),
    });
  }

  protected remove(user: User): void {
    if (!confirm(`Supprimer l'utilisateur ${user.email} ?`)) {
      return;
    }
    // Le back refuse (409) si l'utilisateur a enregistré des incidents
    this.service.delete(user.id).subscribe({
      next: () => {
        this.notifications.success('Utilisateur supprimé.');
        this.load();
      },
      error: (err) => this.notifications.error(errorMessage(err)),
    });
  }

  private load(): void {
    this.service.list().subscribe({
      next: (list) => {
        this.users.set(list);
        this.error.set(null);
      },
      error: (err) => this.error.set(errorMessage(err)),
    });
  }
}
