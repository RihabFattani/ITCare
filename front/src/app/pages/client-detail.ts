import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClientService, IncidentService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Client, Incident } from '../core/models';
import { errorMessage } from '../core/utils';
import { activiteLabel, prioriteClass, prioriteLabel, statutClass, statutLabel } from '../shared/labels';
import { SecureSrc } from '../shared/secure-src';
import { sla } from '../shared/sla';

/** Fiche d'un client : coordonnées, indicateurs et historique de tous ses tickets. */
@Component({
  selector: 'app-client-detail',
  imports: [RouterLink, DatePipe, SecureSrc],
  template: `
    <div class="header bg-gradient-primary pb-8 pt-5 pt-md-8">
      <div class="container-fluid">
        <a routerLink="/clients" class="text-white-50"><i class="fas fa-arrow-left mr-1"></i> Retour aux clients</a>
        <h1 class="text-white mb-0 mt-2">{{ client()?.nom ?? 'Client' }}</h1>
      </div>
    </div>

    <div class="container-fluid mt--7">
      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      }
      @if (client(); as c) {
        <div class="row">
          <div class="col-xl-4 mb-4">
            <div class="card shadow text-center">
              <div class="card-body">
                @if (c.photo) {
                  <img [secureSrc]="c.photo" folder="clients" class="client-logo client-logo-xl mb-3" [alt]="c.nom" />
                }
                <h3 class="mb-1">{{ c.nom }}</h3>
                <span class="badge badge-info">{{ activite(c.activite) }}</span>
                <hr />
                <div class="text-left text-sm">
                  @if (c.adresse) { <div class="mb-2"><i class="fas fa-map-marker-alt text-primary mr-2"></i>{{ c.adresse }}</div> }
                  @if (c.tel) { <div class="mb-2"><i class="fas fa-phone text-primary mr-2"></i>{{ c.tel }}</div> }
                  @if (c.email) { <div class="mb-2"><i class="fas fa-envelope text-primary mr-2"></i><a [href]="'mailto:' + c.email">{{ c.email }}</a></div> }
                </div>
                <div class="d-flex mt-3">
                  <a [routerLink]="['/incidents/new']" [queryParams]="{ clientId: c.id }" class="btn btn-primary flex-fill mr-2">
                    <i class="fas fa-plus mr-1"></i>Ticket
                  </a>
                  @if (auth.isAdmin()) {
                    <a [routerLink]="['/clients', c.id, 'edit']" class="btn btn-outline-warning flex-fill">
                      <i class="fas fa-edit mr-1"></i>Modifier
                    </a>
                  }
                </div>
              </div>
            </div>
          </div>

          <div class="col-xl-8 mb-4">
            <div class="row">
              @for (k of kpis(); track k.label) {
                <div class="col-md-3 col-6 mb-3">
                  <div class="cal-kpi {{ k.cls }}">
                    <i class="fas {{ k.icon }}"></i>
                    <div>
                      <div class="cal-kpi-value">{{ k.value }}</div>
                      <div class="cal-kpi-label">{{ k.label }}</div>
                    </div>
                  </div>
                </div>
              }
            </div>

            <div class="card shadow">
              <div class="card-header bg-white d-flex justify-content-between align-items-center">
                <h3 class="mb-0">Historique des tickets</h3>
                <span class="text-muted">Taux de résolution : <strong>{{ rate() }}%</strong></span>
              </div>
              <div class="table-responsive">
                <table class="table align-items-center table-flush">
                  <thead class="thead-light">
                    <tr><th>Ticket</th><th>Priorité</th><th>Statut</th><th>Délai</th><th>Signalé le</th></tr>
                  </thead>
                  <tbody>
                    @for (i of incidents(); track i.id) {
                      <tr>
                        <td><a [routerLink]="['/incidents', i.id]">#{{ i.id }} {{ i.libelle }}</a></td>
                        <td><span class="badge {{ prioriteClass(i.priorite) }}">{{ prioriteLabel(i.priorite) }}</span></td>
                        <td><span class="badge {{ statutClass(i.statut) }}">{{ statutLabel(i.statut) }}</span></td>
                        <td><span class="badge {{ sla(i).cls }}">{{ sla(i).label }}</span></td>
                        <td>{{ i.dateSignalement | date: 'dd/MM/yyyy HH:mm' }}</td>
                      </tr>
                    } @empty {
                      <tr><td colspan="5" class="text-center text-muted">Aucun ticket pour ce client.</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      } @else if (!error()) {
        <div class="card shadow"><div class="card-body text-center text-muted">Chargement...</div></div>
      }
    </div>
  `,
})
export class ClientDetail {
  protected readonly auth = inject(AuthService);
  private readonly clients = inject(ClientService);
  private readonly incidentApi = inject(IncidentService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly client = signal<Client | null>(null);
  protected readonly incidents = signal<Incident[]>([]);
  protected readonly error = signal<string | null>(null);

  protected readonly activite = activiteLabel;
  protected readonly prioriteClass = prioriteClass;
  protected readonly prioriteLabel = prioriteLabel;
  protected readonly statutClass = statutClass;
  protected readonly statutLabel = statutLabel;
  protected readonly sla = sla;

  protected readonly rate = computed(() => {
    const l = this.incidents();
    return l.length ? Math.round((l.filter((i) => i.statut === 'RESOLU').length / l.length) * 100) : 0;
  });

  protected readonly kpis = computed(() => {
    const l = this.incidents();
    return [
      { label: 'Tickets', value: l.length, icon: 'fa-ticket-alt', cls: 'k-primary' },
      { label: 'Ouverts', value: l.filter((i) => i.statut !== 'RESOLU').length, icon: 'fa-exclamation-circle', cls: 'k-danger' },
      { label: 'Résolus', value: l.filter((i) => i.statut === 'RESOLU').length, icon: 'fa-check-circle', cls: 'k-success' },
      { label: 'Budget (TND)', value: l.reduce((s, i) => s + i.budget, 0), icon: 'fa-coins', cls: 'k-warning' },
    ];
  });

  constructor() {
    this.clients.get(this.id).subscribe({
      next: (c) => this.client.set(c),
      error: (err) => this.error.set(errorMessage(err)),
    });
    this.incidentApi.list({ clientId: this.id }).subscribe({
      next: (l) => this.incidents.set(l),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }
}
