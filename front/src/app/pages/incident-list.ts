import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, merge, of, startWith, switchMap } from 'rxjs';
import { ClientService, IncidentService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Client, Incident, IncidentFilters } from '../core/models';
import { errorMessage } from '../core/utils';
import { NotificationService } from '../shared/notification';
import {
  PRIORITES,
  STATUTS,
  nextStatut,
  nextStatutAction,
  prioriteClass,
  prioriteLabel,
  statutClass,
  statutLabel,
} from '../shared/labels';

/** Liste des incidents : recherche par libellé, filtres statut / priorité / client, actions selon le rôle. */
@Component({
  selector: 'app-incident-list',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  template: `
    <div class="header bg-gradient-primary pb-8 pt-5 pt-md-8">
      <div class="container-fluid">
        <div class="header-body">
          <h1 class="text-white mb-0">Suivi des incidents</h1>
          <p class="text-white-50 mb-0">Consultez, filtrez et suivez le cycle de vie des tickets.</p>
        </div>
      </div>
    </div>

    <div class="container-fluid mt--7">
      <div class="card shadow">
        <div class="card-header border-0">
          <div class="row align-items-center">
            <div class="col">
              <h3 class="mb-0">Incidents ({{ list().length }})</h3>
            </div>
            <div class="col text-right">
              <a routerLink="/incidents/new" class="btn btn-sm btn-primary">
                <i class="fas fa-plus mr-1"></i> Nouvel incident
              </a>
            </div>
          </div>

          <form [formGroup]="filters" class="row mt-4">
            <div class="col-lg-4 mb-2">
              <div class="input-group input-group-alternative">
                <div class="input-group-prepend">
                  <span class="input-group-text"><i class="fas fa-search"></i></span>
                </div>
                <input class="form-control" placeholder="Rechercher par libellé" formControlName="q" />
              </div>
            </div>
            <div class="col-lg-2 col-md-4 mb-2">
              <select class="form-control form-control-alternative" formControlName="statut">
                <option value="">Tous les statuts</option>
                @for (s of statuts; track s) {
                  <option [value]="s">{{ statutLabel(s) }}</option>
                }
              </select>
            </div>
            <div class="col-lg-2 col-md-4 mb-2">
              <select class="form-control form-control-alternative" formControlName="priorite">
                <option value="">Toutes les priorités</option>
                @for (p of priorites; track p) {
                  <option [value]="p">{{ prioriteLabel(p) }}</option>
                }
              </select>
            </div>
            <div class="col-lg-3 col-md-4 mb-2">
              <select class="form-control form-control-alternative" formControlName="clientId">
                <option value="">Tous les clients</option>
                @for (c of clients(); track c.id) {
                  <option [value]="c.id">{{ c.nom }}</option>
                }
              </select>
            </div>
            <div class="col-lg-1 mb-2">
              <button type="button" class="btn btn-outline-secondary btn-block" title="Réinitialiser"
                      (click)="reset()"><i class="fas fa-undo"></i></button>
            </div>
          </form>
        </div>

        @if (error()) {
          <div class="alert alert-danger mx-4">{{ error() }}</div>
        }

        <div class="table-responsive">
          <table class="table align-items-center table-flush">
            <thead class="thead-light">
              <tr>
                <th scope="col">Incident</th>
                <th scope="col">Client</th>
                <th scope="col">Priorité</th>
                <th scope="col">Statut</th>
                <th scope="col">Durée / Budget</th>
                <th scope="col">Signalé le</th>
                <th scope="col" class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (i of list(); track i.id) {
                <tr>
                  <th scope="row">
                    <a [routerLink]="['/incidents', i.id]" class="font-weight-bold">{{ i.libelle }}</a>
                    <div class="text-muted small font-weight-normal">
                      #{{ i.id }} · par {{ i.user.prenom }} {{ i.user.nom }}
                      @if (i.captureEcran) { · <i class="fas fa-image" title="Capture d'écran"></i> }
                      @if (i.rapportPdf) { · <i class="fas fa-file-pdf" title="Rapport PDF"></i> }
                    </div>
                  </th>
                  <td>{{ i.client.nom }}</td>
                  <td><span class="badge badge-pill {{ prioriteClass(i.priorite) }}">{{ prioriteLabel(i.priorite) }}</span></td>
                  <td>
                    <span class="badge badge-pill badge-statut {{ statutClass(i.statut) }}">{{ statutLabel(i.statut) }}</span>
                  </td>
                  <td>{{ i.duree }} h · {{ i.budget }} TND</td>
                  <td>{{ i.dateSignalement | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td class="text-right text-nowrap">
                    <a [routerLink]="['/incidents', i.id]" class="btn btn-sm btn-outline-info" title="Détail">
                      <i class="fas fa-eye"></i>
                    </a>
                    @if (canAdvance(i)) {
                      @if (next(i); as n) {
                        <button type="button" class="btn btn-sm btn-outline-primary" (click)="advance(i, n)">
                          {{ action(i) }}
                        </button>
                      }
                    }
                    @if (auth.isAdmin()) {
                      @if (i.statut !== 'RESOLU') {
                        <a [routerLink]="['/incidents', i.id, 'edit']" class="btn btn-sm btn-outline-warning"
                           title="Modifier"><i class="fas fa-edit"></i></a>
                      }
                      <button type="button" class="btn btn-sm btn-outline-danger" title="Supprimer"
                              (click)="remove(i)"><i class="fas fa-trash"></i></button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="text-center text-muted py-5">
                    {{ loading() ? 'Chargement...' : 'Aucun incident ne correspond à votre recherche.' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class IncidentList {
  protected readonly auth = inject(AuthService);
  private readonly incidents = inject(IncidentService);
  private readonly clientService = inject(ClientService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);

  protected readonly statuts = STATUTS;
  protected readonly priorites = PRIORITES;
  protected readonly statutLabel = statutLabel;
  protected readonly statutClass = statutClass;
  protected readonly prioriteLabel = prioriteLabel;
  protected readonly prioriteClass = prioriteClass;
  protected readonly next = (i: Incident) => nextStatut(i.statut);
  /** L'Admin, ou le collaborateur auquel le ticket est affecté, peut faire avancer le statut. */
  protected canAdvance(i: Incident): boolean {
    return this.auth.isAdmin() || (i.assigne ?? i.user)?.id === this.auth.user()?.id;
  }
  protected readonly action = (i: Incident) => nextStatutAction(i.statut);

  protected readonly list = signal<Incident[]>([]);
  protected readonly clients = signal<Client[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly filters = this.fb.nonNullable.group({ q: '', statut: '', priorite: '', clientId: '' });
  private readonly reload$ = new Subject<void>();

  constructor() {
    // Les liens du tableau de bord et des clients pré-remplissent les filtres
    // (?statut=OUVERT&priorite=HAUTE&clientId=2)
    const params = this.route.snapshot.queryParamMap;
    this.filters.patchValue(
      {
        statut: params.get('statut') ?? '',
        priorite: params.get('priorite') ?? '',
        clientId: params.get('clientId') ?? '',
      },
      { emitEvent: false },
    );

    this.clientService.list().subscribe({ next: (c) => this.clients.set(c), error: () => {} });

    // Recharge à chaque changement de filtre (avec un délai pour la saisie) ou après une action
    merge(this.filters.valueChanges.pipe(debounceTime(300)), this.reload$)
      .pipe(
        startWith(null),
        switchMap(() => {
          this.loading.set(true);
          return this.incidents.list(this.filters.getRawValue() as IncidentFilters).pipe(
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

  protected reset(): void {
    this.filters.reset({ q: '', statut: '', priorite: '', clientId: '' });
  }

  /** RG2 : une seule transition possible à la fois (le back vérifie aussi). RG8 : Admin uniquement. */
  protected advance(incident: Incident, statut: NonNullable<ReturnType<typeof nextStatut>>): void {
    this.incidents.changeStatut(incident.id, statut).subscribe({
      next: () => {
        this.notifications.success(`Incident #${incident.id} : statut « ${statutLabel(statut)} ».`);
        this.reload$.next();
      },
      error: (err) => this.notifications.error(errorMessage(err)),
    });
  }

  protected remove(incident: Incident): void {
    if (!confirm(`Supprimer définitivement l'incident « ${incident.libelle} » ?`)) {
      return;
    }
    this.incidents.delete(incident.id).subscribe({
      next: () => {
        this.notifications.success('Incident supprimé.');
        this.reload$.next();
      },
      error: (err) => this.notifications.error(errorMessage(err)),
    });
  }
}
