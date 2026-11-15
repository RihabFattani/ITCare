import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IncidentService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Incident, Statut } from '../core/models';
import { errorMessage } from '../core/utils';
import { NotificationService } from '../shared/notification';
import { sla } from '../shared/sla';
import { SecureSrc } from '../shared/secure-src';
import { activiteLabel, prioriteClass, prioriteLabel, statutClass, statutLabel } from '../shared/labels';

interface Cell {
  date: Date;
  key: string;
  inMonth: boolean;
  today: boolean;
  items: Incident[];
}

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const PRIO_ORDER = { HAUTE: 0, MOYENNE: 1, BASSE: 2 } as const;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Calendrier de pilotage (style Jira) : tickets du collaborateur par jour, liste « à faire » et fiche détaillée. */
@Component({
  selector: 'app-calendar',
  imports: [DatePipe, RouterLink, SecureSrc],
  template: `
    <div class="header bg-gradient-primary pb-8 pt-5 pt-md-8">
      <div class="container-fluid">
        <div class="header-body">
          <h1 class="text-white mb-1">Mon calendrier</h1>
          <p class="text-white-50 mb-4">Vos tickets placés à leur échéance.{{ auth.isAdmin() ? " Glissez un ticket vers un autre jour pour le replanifier." : "" }}</p>
          <div class="row">
            @for (k of kpis(); track k.label) {
              <div class="col-xl-3 col-md-6 mb-3 mb-xl-0">
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
        </div>
      </div>
    </div>

    <div class="container-fluid mt--7">
      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      }
      <div class="row">
        <!-- Calendrier -->
        <div class="col-xl-8 mb-4">
          <div class="card shadow">
            <div class="card-header bg-white">
              <div class="row align-items-center">
                <div class="col-md-5 mb-2 mb-md-0">
                  <div class="d-flex align-items-center">
                    <button class="btn btn-sm btn-outline-primary mr-1" (click)="shift(-1)" aria-label="Mois précédent">
                      <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary mr-2" (click)="shift(1)" aria-label="Mois suivant">
                      <i class="fas fa-chevron-right"></i>
                    </button>
                    <h2 class="mb-0 text-capitalize">{{ monthLabel() }}</h2>
                  </div>
                </div>
                <div class="col-md-7 text-md-right">
                  <button class="btn btn-sm btn-primary mr-2" (click)="today()">Aujourd'hui</button>
                  <div class="btn-group btn-group-sm mr-2" role="group">
                    <button class="btn" [class.btn-default]="scope() === 'mine'" [class.btn-outline-default]="scope() !== 'mine'"
                            (click)="scope.set('mine')">Mes tickets</button>
                    <button class="btn" [class.btn-default]="scope() === 'all'" [class.btn-outline-default]="scope() !== 'all'"
                            (click)="scope.set('all')">Tous</button>
                  </div>
                  <a routerLink="/incidents/new" class="btn btn-sm btn-success"><i class="fas fa-plus mr-1"></i>Ticket</a>
                </div>
              </div>
              <div class="cal-filters mt-3">
                @for (f of statutFilters; track f.value) {
                  <button type="button" class="cal-chip" [class.active]="statut() === f.value"
                          (click)="statut.set(f.value)">
                    @if (f.value) { <i class="dot {{ f.dot }}"></i> }{{ f.label }}
                  </button>
                }
              </div>
            </div>

            <div class="card-body p-2 p-md-3">
              @if (loading()) {
                <div class="text-center text-muted py-6">Chargement du calendrier...</div>
              } @else {
                <div class="cal-grid cal-head">
                  @for (j of jours; track j) { <div>{{ j }}</div> }
                </div>
                <div class="cal-grid cal-body">
                  @for (c of cells(); track c.key) {
                    <div class="cal-cell" [class.out]="!c.inMonth" [class.today]="c.today"
                         [class.selected]="selectedDay() === c.key" [class.drop]="dropKey() === c.key"
                         (click)="selectDay(c)" (dragover)="over($event, c)" (dragleave)="dropKey.set(null)"
                         (drop)="drop($event, c)">
                      <div class="cal-day">{{ c.date.getDate() }}</div>
                      @for (i of c.items.slice(0, 3); track i.id) {
                        <div class="cal-event ev-{{ i.statut }}" (click)="open(i, $event)"
                             [class.sel]="selected()?.id === i.id" [class.late]="sla(i).level === 'late'"
                             [attr.draggable]="canDrag(i)" (dragstart)="start($event, i)" (dragend)="dropKey.set(null)"
                             [title]="i.libelle + ' — ' + sla(i).label">
                          <span class="ev-prio prio-{{ i.priorite }}"></span>
                          <span class="ev-text">{{ dueOf(i) | date: 'HH:mm' }} {{ i.libelle }}</span>
                        </div>
                      }
                      @if (c.items.length > 3) {
                        <div class="cal-more">+{{ c.items.length - 3 }} autre(s)</div>
                      }
                    </div>
                  }
                </div>
                <div class="cal-legend mt-3">
                  <span><i class="dot bg-danger"></i>Ouvert</span>
                  <span><i class="dot bg-warning"></i>En cours</span>
                  <span><i class="dot bg-success"></i>Résolu</span>
                  <span><i class="dot late-dot"></i>Contour clignotant : en retard</span>
                  <span class="text-muted ml-auto">Pastille à gauche : priorité (haute = foncé)</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Panneau de droite -->
        <div class="col-xl-4 mb-4">
          @if (selected(); as t) {
            <div class="card shadow cal-detail">
              <div class="card-header bg-white d-flex align-items-center justify-content-between">
                <h3 class="mb-0">Détail du ticket</h3>
                <button class="btn btn-sm btn-link text-muted" (click)="selected.set(null)" aria-label="Fermer">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <div class="card-body">
                <div class="mb-2">
                  <span class="badge {{ statutClass(t.statut) }} mr-1">{{ statutLabel(t.statut) }}</span>
                  <span class="badge {{ prioriteClass(t.priorite) }} mr-1">Priorité {{ prioriteLabel(t.priorite) }}</span>
                  <span class="badge {{ sla(t).cls }}"><i class="far fa-clock mr-1"></i>{{ sla(t).label }}</span>
                </div>
                <h4 class="mb-1">#{{ t.id }} · {{ t.libelle }}</h4>
                <p class="text-muted mb-3">{{ t.description || 'Aucune description.' }}</p>

                <div class="d-flex align-items-center mb-3 cal-client">
                  @if (t.client.photo) {
                    <img [secureSrc]="t.client.photo" folder="clients" class="client-logo mr-3" [alt]="t.client.nom" />
                  }
                  <div>
                    <strong>{{ t.client.nom }}</strong>
                    <div class="text-sm text-muted">{{ activite(t.client.activite) }}</div>
                    @if (t.client.tel) { <div class="text-sm"><i class="fas fa-phone mr-1"></i>{{ t.client.tel }}</div> }
                    @if (t.client.email) { <div class="text-sm"><i class="fas fa-envelope mr-1"></i>{{ t.client.email }}</div> }
                    @if (t.client.adresse) { <div class="text-sm"><i class="fas fa-map-marker-alt mr-1"></i>{{ t.client.adresse }}</div> }
                  </div>
                </div>

                <dl class="cal-dl">
                  <div><dt><i class="far fa-calendar-plus"></i> Signalé le</dt><dd>{{ t.dateSignalement | date: 'dd/MM/yyyy HH:mm' }}</dd></div>
                  <div><dt><i class="far fa-clock"></i> Durée estimée</dt><dd>{{ t.duree }} h</dd></div>
                  <div><dt><i class="far fa-calendar-check"></i> Échéance</dt><dd>{{ dueOf(t) | date: 'dd/MM/yyyy HH:mm' }}</dd></div>
                  <div><dt><i class="fas fa-coins"></i> Budget</dt><dd>{{ t.budget }} TND</dd></div>
                  <div>
                    <dt><i class="far fa-user"></i> Assigné à</dt>
                    <dd>{{ ((t.assigne ?? t.user).prenom || '') + ' ' + (t.assigne ?? t.user).nom }}</dd>
                  </div>
                  <div><dt><i class="fas fa-paperclip"></i> Pièces jointes</dt>
                    <dd>{{ t.captureEcran ? 'Capture' : '' }}{{ t.captureEcran && t.rapportPdf ? ' + ' : '' }}{{ t.rapportPdf ? 'Rapport PDF' : '' }}{{ !t.captureEcran && !t.rapportPdf ? 'Aucune' : '' }}</dd>
                  </div>
                </dl>
                <a [routerLink]="['/incidents', t.id]" class="btn btn-primary btn-block">
                  <i class="fas fa-external-link-alt mr-1"></i>Ouvrir le ticket complet
                </a>
              </div>
            </div>
          } @else {
            <div class="card shadow">
              <div class="card-header bg-white">
                <h3 class="mb-0">
                  @if (selectedDay()) { Échéances du {{ dayLabel() }} } @else { À faire }
                </h3>
                <small class="text-muted">
                  @if (selectedDay()) { {{ panelList().length }} ticket(s) ce jour }
                  @else { Triés par priorité puis par date }
                </small>
                @if (selectedDay()) {
                  <button class="btn btn-sm btn-link p-0 d-block" (click)="selectedDay.set(null)">
                    Voir tous mes tickets à faire
                  </button>
                }
              </div>
              <div class="list-group list-group-flush cal-todo">
                @for (i of panelList(); track i.id) {
                  <a class="list-group-item list-group-item-action cursor-pointer" (click)="open(i, $event)">
                    <div class="d-flex align-items-start">
                      <span class="ev-prio prio-{{ i.priorite }} mt-2 mr-2"></span>
                      <div class="flex-grow-1">
                        <div class="font-weight-bold">{{ i.libelle }}</div>
                        <div class="text-sm text-muted">{{ i.client.nom }} · {{ i.dateSignalement | date: 'dd/MM HH:mm' }}</div>
                      </div>
                      <span class="badge {{ statutClass(i.statut) }}">{{ statutLabel(i.statut) }}</span>
                    </div>
                  </a>
                } @empty {
                  <div class="list-group-item text-center text-muted py-5">
                    <i class="fas fa-check-circle fa-2x text-success mb-2 d-block"></i>
                    Rien à faire ici. Beau travail !
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class Calendar {
  private readonly incidents = inject(IncidentService);
  protected readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  protected readonly sla = sla;
  protected readonly dropKey = signal<string | null>(null);
  private dragged: Incident | null = null;

  protected readonly jours = JOURS;
  protected readonly statutFilters: { value: Statut | ''; label: string; dot: string }[] = [
    { value: '', label: 'Tous', dot: '' },
    { value: 'OUVERT', label: 'Ouvert', dot: 'bg-danger' },
    { value: 'EN_COURS', label: 'En cours', dot: 'bg-warning' },
    { value: 'RESOLU', label: 'Résolu', dot: 'bg-success' },
  ];

  protected readonly all = signal<Incident[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly scope = signal<'mine' | 'all'>(this.auth.isAdmin() ? 'all' : 'mine');
  protected readonly statut = signal<Statut | ''>('');
  protected readonly month = signal(this.firstOfMonth(new Date()));
  protected readonly selectedDay = signal<string | null>(null);
  protected readonly selected = signal<Incident | null>(null);

  protected readonly statutClass = statutClass;
  protected readonly statutLabel = statutLabel;
  protected readonly prioriteClass = prioriteClass;
  protected readonly prioriteLabel = prioriteLabel;
  protected readonly activite = activiteLabel;

  /** Tickets visibles : portée (mes tickets / tous) + filtre de statut. */
  private readonly visible = computed(() => {
    const me = this.auth.user()?.id;
    const st = this.statut();
    return this.all().filter(
      (i) => (this.scope() === 'all' || (i.assigne ?? i.user)?.id === me) && (!st || i.statut === st),
    );
  });

  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(this.month()),
  );

  protected readonly cells = computed<Cell[]>(() => {
    const first = this.month();
    const offset = (first.getDay() + 6) % 7; // semaine commençant le lundi
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    const byDay = new Map<string, Incident[]>();
    for (const i of this.visible()) {
      const k = dayKey(this.dueOf(i));
      byDay.set(k, [...(byDay.get(k) ?? []), i]);
    }
    const todayKey = dayKey(new Date());
    return Array.from({ length: 42 }, (_, n) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + n);
      const key = dayKey(date);
      const items = (byDay.get(key) ?? []).sort(
        (a, b) => this.dueOf(a).getTime() - this.dueOf(b).getTime(),
      );
      return { date, key, inMonth: date.getMonth() === first.getMonth(), today: key === todayKey, items };
    });
  });

  /** Liste de droite : tickets du jour sélectionné, sinon tous les tickets non résolus. */
  protected readonly panelList = computed(() => {
    const day = this.selectedDay();
    if (day) {
      return this.cells().find((c) => c.key === day)?.items ?? [];
    }
    return this.visible()
      .filter((i) => i.statut !== 'RESOLU')
      .sort(
        (a, b) =>
          PRIO_ORDER[a.priorite] - PRIO_ORDER[b.priorite] ||
          this.dueOf(a).getTime() - this.dueOf(b).getTime(),
      );
  });

  protected readonly kpis = computed(() => {
    const v = this.visible();
    const todo = v.filter((i) => i.statut !== 'RESOLU');
    return [
      { label: 'À faire', value: todo.length, icon: 'fa-clipboard-list', cls: 'k-primary' },
      { label: 'En cours', value: v.filter((i) => i.statut === 'EN_COURS').length, icon: 'fa-tools', cls: 'k-warning' },
      { label: 'En retard', value: todo.filter((i) => sla(i).level === 'late').length, icon: 'fa-fire', cls: 'k-danger' },
      { label: 'Heures prévues', value: todo.reduce((s, i) => s + i.duree, 0), icon: 'fa-hourglass-half', cls: 'k-success' },
    ];
  });

  constructor() {
    this.incidents.list().subscribe({
      next: (list) => {
        this.all.set(list);
        this.loading.set(false);
        // Se place sur le mois du ticket le plus récent si le mois courant est vide
        const mine = list.filter((i) => this.scope() === 'all' || (i.assigne ?? i.user)?.id === this.auth.user()?.id);
        const now = this.month();
        const hasCurrent = mine.some((i) => {
          const d = this.dueOf(i);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
        if (!hasCurrent && mine.length) {
          const latest = mine.map((i) => this.dueOf(i)).sort((a, b) => b.getTime() - a.getTime())[0];
          this.month.set(this.firstOfMonth(latest));
        }
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected shift(delta: number): void {
    const m = this.month();
    this.month.set(new Date(m.getFullYear(), m.getMonth() + delta, 1));
    this.selectedDay.set(null);
  }

  protected today(): void {
    this.month.set(this.firstOfMonth(new Date()));
    this.selectedDay.set(dayKey(new Date()));
    this.selected.set(null);
  }

  protected selectDay(c: Cell): void {
    this.selected.set(null);
    this.selectedDay.set(this.selectedDay() === c.key ? null : c.key);
  }

  protected open(i: Incident, event: Event): void {
    event.stopPropagation();
    this.selected.set(i);
  }

  protected dayLabel(): string {
    const k = this.selectedDay();
    return k ? new Date(k + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  }

  /** Date où le ticket est placé : son échéance (à défaut, sa date de signalement). */
  protected dueOf(i: Incident): Date {
    return new Date(i.dateEcheance ?? i.dateSignalement);
  }

  protected canDrag(i: Incident): boolean {
    return this.auth.isAdmin() && i.statut !== 'RESOLU';
  }

  protected start(event: DragEvent, i: Incident): void {
    if (!this.canDrag(i)) {
      event.preventDefault();
      return;
    }
    this.dragged = i;
    event.dataTransfer?.setData('text/plain', `${i.id}`);
  }

  protected over(event: DragEvent, c: Cell): void {
    if (this.dragged) {
      event.preventDefault();
      this.dropKey.set(c.key);
    }
  }

  /** Replanification par glisser-déposer : même heure, nouveau jour (Admin). */
  protected drop(event: DragEvent, c: Cell): void {
    event.preventDefault();
    const i = this.dragged;
    this.dragged = null;
    this.dropKey.set(null);
    if (!i || dayKey(this.dueOf(i)) === c.key) {
      return;
    }
    const old = this.dueOf(i);
    const next = new Date(c.date.getFullYear(), c.date.getMonth(), c.date.getDate(), old.getHours(), old.getMinutes());
    const value = `${dayKey(next)}T${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}:00`;
    this.incidents.reschedule(i.id, value).subscribe({
      next: (updated) => {
        this.all.update((l) => l.map((x) => (x.id === updated.id ? updated : x)));
        if (this.selected()?.id === updated.id) {
          this.selected.set(updated);
        }
        this.notifications.success(`Ticket #${i.id} replanifié au ${next.toLocaleDateString('fr-FR')}.`);
      },
      error: (err) => this.notifications.error(errorMessage(err)),
    });
  }

  private firstOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
}
