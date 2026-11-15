import { Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { StatsService } from '../core/api.service';
import { Stats } from '../core/models';
import { CountUp } from '../shared/count-up';
import { errorMessage } from '../core/utils';

Chart.register(...registerables);

/** Tableau de bord (Admin) : incidents ouverts / en cours / résolus, priorité HAUTE, graphiques, classement des clients. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CountUp],
  template: `
    <div class="header bg-gradient-primary pb-8 pt-5 pt-md-8">
      <div class="container-fluid">
        <div class="header-body">
          <h1 class="text-white mb-1">Tableau de bord</h1>
          <p class="text-white-50 mb-4">Vue d'ensemble des incidents et de l'activité du support.</p>
          @if (stats(); as s) {
            <div class="row">
              @for (t of tiles(s); track t.label) {
                <div class="col-xl-3 col-md-6 mb-4 mb-xl-0">
                  <a class="stat-tile {{ t.cls }}" routerLink="/incidents" [queryParams]="t.query">
                    <i class="stat-bg fas {{ t.icon }}"></i>
                    <div class="stat-label">{{ t.label }}</div>
                    <div class="stat-value"><span [appCountUp]="t.value">0</span></div>
                    <div class="stat-foot">
                      <div class="stat-bar"><span [style.width.%]="percent(t.value, s.total)"></span></div>
                      <small>{{ percent(t.value, s.total) }}% des {{ s.total }} incidents</small>
                    </div>
                  </a>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>

    <div class="container-fluid mt--7">
      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      } @else if (!stats()) {
        <div class="card shadow"><div class="card-body text-center text-muted">Chargement...</div></div>
      } @else {
        <div class="row">
          <div class="col-xl-4 mb-4">
            <div class="card shadow h-100">
              <div class="card-header bg-transparent">
                <h6 class="text-uppercase text-muted ls-1 mb-1">Performance</h6>
                <h2 class="mb-0">Taux de résolution</h2>
              </div>
              <div class="card-body text-center d-flex flex-column justify-content-center">
                <div class="gauge mx-auto" [style.--p]="resolutionRate()">
                  <div class="gauge-inner">
                    <strong>{{ resolutionRate() }}%</strong>
                    <small class="text-muted">résolus</small>
                  </div>
                </div>
                <div class="gauge-legend mt-4">
                  <span><i class="dot bg-danger"></i>Ouverts {{ stats()!.ouverts }}</span>
                  <span><i class="dot bg-warning"></i>En cours {{ stats()!.enCours }}</span>
                  <span><i class="dot bg-success"></i>Résolus {{ stats()!.resolus }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="col-xl-4 mb-4">
            <div class="card shadow h-100">
              <div class="card-header bg-transparent">
                <h6 class="text-uppercase text-muted ls-1 mb-1">Répartition</h6>
                <h2 class="mb-0">Incidents par statut</h2>
              </div>
              <div class="card-body">
                <div style="position: relative; height: 260px">
                  <canvas #statutCanvas></canvas>
                </div>
              </div>
            </div>
          </div>
          <div class="col-xl-4 mb-4">
            <div class="card shadow h-100">
              <div class="card-header bg-transparent">
                <h6 class="text-uppercase text-muted ls-1 mb-1">Répartition</h6>
                <h2 class="mb-0">Incidents par priorité</h2>
              </div>
              <div class="card-body">
                <div style="position: relative; height: 260px">
                  <canvas #prioriteCanvas></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="row mt-5">
          <div class="col-12">
            <div class="card shadow">
              <div class="card-header border-0">
                <h3 class="mb-0">Clients ayant le plus d'incidents</h3>
              </div>
              <div class="table-responsive">
                <table class="table align-items-center table-flush">
                  <thead class="thead-light">
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Client</th>
                      <th scope="col">Incidents</th>
                      <th scope="col">Part</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of stats()!.parClient; track c.clientId; let i = $index) {
                      <tr>
                        <td>{{ i + 1 }}</td>
                        <th scope="row">{{ c.client }}</th>
                        <td>{{ c.total }}</td>
                        <td>
                          <div class="d-flex align-items-center">
                            <span class="mr-2">{{ clientPercent(c.total) }}%</span>
                            <div class="progress" style="width: 160px">
                              <div class="progress-bar bg-gradient-primary" role="progressbar"
                                   [style.width.%]="clientPercent(c.total)"></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr><td colspan="4" class="text-center text-muted">Aucun incident enregistré.</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class Dashboard {
  private readonly statsService = inject(StatsService);

  protected readonly stats = signal<Stats | null>(null);
  protected readonly error = signal<string | null>(null);

  private readonly statutCanvas = viewChild<ElementRef<HTMLCanvasElement>>('statutCanvas');
  private readonly prioriteCanvas = viewChild<ElementRef<HTMLCanvasElement>>('prioriteCanvas');
  private charts: Chart[] = [];

  private readonly totalClients = computed(() =>
    (this.stats()?.parClient ?? []).reduce((sum, c) => sum + c.total, 0),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.destroyCharts());

    this.statsService.get().subscribe({
      next: (s) => this.stats.set(s),
      error: (err) => this.error.set(errorMessage(err)),
    });

    // Dessine les graphiques dès que les données ET les <canvas> sont disponibles
    effect(() => {
      const s = this.stats();
      const statutEl = this.statutCanvas();
      const prioriteEl = this.prioriteCanvas();
      if (!s || !statutEl || !prioriteEl) {
        return;
      }
      this.destroyCharts();
      this.charts = [
        new Chart(statutEl.nativeElement, {
          type: 'doughnut',
          data: {
            labels: ['Ouvert', 'En cours', 'Résolu'],
            datasets: [
              {
                data: [s.parStatut.OUVERT, s.parStatut.EN_COURS, s.parStatut.RESOLU],
                backgroundColor: ['#f5365c', '#fb6340', '#2dce89'],
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
        }),
        new Chart(prioriteEl.nativeElement, {
          type: 'bar',
          data: {
            labels: ['Basse', 'Moyenne', 'Haute'],
            datasets: [
              {
                label: 'Incidents',
                data: [s.parPriorite.BASSE, s.parPriorite.MOYENNE, s.parPriorite.HAUTE],
                backgroundColor: ['#11cdef', '#5e72e4', '#32325d'],
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
          },
        }),
      ];
    });
  }

  protected tiles(s: Stats) {
    return [
      { label: 'Ouverts', value: s.ouverts, icon: 'fa-exclamation-circle', cls: 'tile-danger', query: { statut: 'OUVERT' } },
      { label: 'En cours', value: s.enCours, icon: 'fa-tools', cls: 'tile-warning', query: { statut: 'EN_COURS' } },
      { label: 'Résolus', value: s.resolus, icon: 'fa-check-circle', cls: 'tile-success', query: { statut: 'RESOLU' } },
      {
        label: 'Priorité haute ouverts',
        value: s.hautePrioriteOuverts,
        icon: 'fa-fire',
        cls: 'tile-dark',
        query: { statut: 'OUVERT', priorite: 'HAUTE' },
      },
    ];
  }

  protected percent(value: number, total: number): number {
    return total ? Math.round((value / total) * 100) : 0;
  }

  protected resolutionRate(): number {
    const s = this.stats();
    return s ? this.percent(s.resolus, s.total) : 0;
  }

  protected clientPercent(total: number): number {
    const sum = this.totalClients();
    return sum ? Math.round((total / sum) * 100) : 0;
  }

  private destroyCharts(): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }
}
