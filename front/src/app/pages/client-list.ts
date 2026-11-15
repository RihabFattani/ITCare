import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, merge, of, startWith, switchMap } from 'rxjs';
import { ClientService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Client } from '../core/models';
import { errorMessage } from '../core/utils';
import { ACTIVITES, activiteLabel } from '../shared/labels';
import { NotificationService } from '../shared/notification';
import { SecureSrc } from '../shared/secure-src';

/** Clients sous forme de cartes : recherche par nom, filtre par activité (consulter/ajouter : tous ; modifier/supprimer : Admin). */
@Component({
  selector: 'app-client-list',
  imports: [ReactiveFormsModule, RouterLink, SecureSrc],
  template: `
    <div class="header bg-gradient-primary pb-8 pt-5 pt-md-8">
      <div class="container-fluid">
        <div class="header-body">
          <h1 class="text-white mb-0">Clients de TechSolutions</h1>
          <p class="text-white-50 mb-0">Banques, cliniques, écoles et commerces suivis par le support.</p>
        </div>
      </div>
    </div>

    <div class="container-fluid mt--7">
      <div class="card shadow mb-4">
        <div class="card-body">
          <form [formGroup]="filters" class="row align-items-center">
            <div class="col-lg-5 mb-2 mb-lg-0">
              <div class="input-group input-group-alternative">
                <div class="input-group-prepend">
                  <span class="input-group-text"><i class="fas fa-search"></i></span>
                </div>
                <input class="form-control" placeholder="Rechercher par nom" formControlName="q" />
              </div>
            </div>
            <div class="col-lg-3 mb-2 mb-lg-0">
              <select class="form-control form-control-alternative" formControlName="activite">
                <option value="">Toutes les activités</option>
                @for (a of activites; track a.value) {
                  <option [value]="a.value">{{ a.label }}</option>
                }
              </select>
            </div>
            <div class="col-lg-4 text-lg-right">
              <span class="text-muted mr-3">{{ list().length }} client(s)</span>
              <a routerLink="/clients/new" class="btn btn-sm btn-primary">
                <i class="fas fa-plus mr-1"></i> Nouveau client
              </a>
            </div>
          </form>
        </div>
      </div>

      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      }

      <div class="row">
        @for (c of list(); track c.id) {
          <div class="col-xl-4 col-md-6 mb-4">
            <div class="card shadow h-100">
              <div class="card-body">
                <div class="d-flex align-items-center mb-3">
                  @if (c.photo) {
                    <img [secureSrc]="c.photo" folder="clients" class="client-logo mr-3" [alt]="'Logo ' + c.nom" />
                  } @else {
                    <span class="client-logo mr-3 d-flex align-items-center justify-content-center text-muted">
                      <i class="fas fa-building fa-lg"></i>
                    </span>
                  }
                  <div>
                    <h4 class="mb-1"><a [routerLink]="['/clients', c.id]">{{ c.nom }}</a></h4>
                    <span class="badge badge-info">{{ activite(c.activite) }}</span>
                  </div>
                </div>
                <ul class="list-unstyled text-sm mb-0">
                  @if (c.email) { <li><i class="fas fa-envelope text-muted mr-2"></i>{{ c.email }}</li> }
                  @if (c.tel) { <li><i class="fas fa-phone text-muted mr-2"></i>{{ c.tel }}</li> }
                  @if (c.adresse) { <li><i class="fas fa-map-marker-alt text-muted mr-2"></i>{{ c.adresse }}</li> }
                </ul>
              </div>
              <div class="card-footer d-flex justify-content-between">
                <a [routerLink]="['/clients', c.id]" class="btn btn-sm btn-outline-info" title="Fiche et historique du client">
                  <i class="fas fa-ticket-alt mr-1"></i> Fiche &amp; tickets
                </a>
                @if (auth.isAdmin()) {
                  <div>
                    <a [routerLink]="['/clients', c.id, 'edit']" class="btn btn-sm btn-outline-warning"
                       title="Modifier"><i class="fas fa-edit"></i></a>
                    <button type="button" class="btn btn-sm btn-outline-danger" title="Supprimer"
                            (click)="remove(c)"><i class="fas fa-trash"></i></button>
                  </div>
                }
              </div>
            </div>
          </div>
        } @empty {
          <div class="col-12">
            <div class="card shadow">
              <div class="card-body text-center text-muted py-5">
                {{ loading() ? 'Chargement...' : 'Aucun client ne correspond à votre recherche.' }}
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ClientList {
  protected readonly auth = inject(AuthService);
  private readonly clients = inject(ClientService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly activites = ACTIVITES;
  protected readonly activite = activiteLabel;

  protected readonly list = signal<Client[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly filters = this.fb.nonNullable.group({ q: '', activite: '' });
  private readonly reload$ = new Subject<void>();

  constructor() {
    merge(this.filters.valueChanges.pipe(debounceTime(300)), this.reload$)
      .pipe(
        startWith(null),
        switchMap(() => {
          this.loading.set(true);
          const { q, activite } = this.filters.getRawValue();
          return this.clients.list(q, activite).pipe(
            catchError((err) => {
              this.error.set(errorMessage(err));
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result) {
          this.list.set(result);
          this.error.set(null);
        }
        this.loading.set(false);
      });
  }

  protected remove(client: Client): void {
    if (!confirm(`Supprimer le client « ${client.nom} » ?`)) {
      return;
    }
    // RG6 : le back refuse (409) si le client a des incidents, le message s'affiche dans une notification
    this.clients.delete(client.id).subscribe({
      next: () => {
        this.notifications.success('Client supprimé.');
        this.reload$.next();
      },
      error: (err) => this.notifications.error(errorMessage(err)),
    });
  }
}
