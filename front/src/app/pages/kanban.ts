import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IncidentService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Incident, Statut } from '../core/models';
import { errorMessage } from '../core/utils';
import { STATUTS, nextStatut, prioriteClass, prioriteLabel, statutLabel } from '../shared/labels';
import { NotificationService } from '../shared/notification';
import { SecureSrc } from '../shared/secure-src';
import { sla } from '../shared/sla';

const PRIO_ORDER = { HAUTE: 0, MOYENNE: 1, BASSE: 2 } as const;

/** Tableau Kanban : une colonne par statut ; l'Admin glisse une carte vers la colonne suivante (RG2, RG8). */
@Component({
  selector: 'app-kanban',
  imports: [DatePipe, RouterLink, SecureSrc],
  template: `
    <div class="header bg-gradient-primary pb-8 pt-5 pt-md-8">
      <div class="container-fluid">
        <div class="header-body">
          <h1 class="text-white mb-1">Tableau Kanban</h1>
          <p class="text-white-50 mb-0">
            Glissez une de vos cartes vers la colonne suivante pour changer son statut
            @if (auth.isAdmin()) { (toutes les cartes pour l'administrateur) } @else { (tickets qui vous sont affectés) }.
          </p>
        </div>
      </div>
    </div>

    <div class="container-fluid mt--7">
      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      }
      <div class="card shadow mb-4">
        <div class="card-body py-3 d-flex flex-wrap align-items-center">
          <div class="btn-group btn-group-sm mr-3" role="group">
            <button class="btn" [class.btn-default]="scope() === 'mine'" [class.btn-outline-default]="scope() !== 'mine'"
                    (click)="scope.set('mine')">Mes tickets</button>
            <button class="btn" [class.btn-default]="scope() === 'all'" [class.btn-outline-default]="scope() !== 'all'"
                    (click)="scope.set('all')">Tous</button>
          </div>
          <div class="input-group input-group-alternative input-group-sm kb-search">
            <div class="input-group-prepend"><span class="input-group-text"><i class="fas fa-search"></i></span></div>
            <input class="form-control" placeholder="Filtrer par libellé ou client" (input)="query.set($any($event.target).value)" />
          </div>
          <span class="ml-auto text-muted">{{ visible().length }} ticket(s)</span>
        </div>
      </div>

      <div class="row">
        @for (col of columns; track col.statut) {
          <div class="col-lg-4 mb-4">
            <div class="kb-col kb-{{ col.statut }}" [class.drop]="dragOver() === col.statut"
                 (dragover)="over($event, col.statut)" (dragleave)="dragOver.set(null)" (drop)="drop($event, col.statut)">
              <div class="kb-head">
                <span><i class="fas {{ col.icon }} mr-2"></i>{{ col.label }}</span>
                <span class="kb-count">{{ byStatut(col.statut).length }}</span>
              </div>
              <div class="kb-body">
                @for (i of byStatut(col.statut); track i.id) {
                  <div class="kb-card prio-{{ i.priorite }}" [attr.draggable]="canDrag(i)"
                       (dragstart)="start($event, i)" (dragend)="dragOver.set(null)">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                      <a class="kb-title" [routerLink]="['/incidents', i.id]">#{{ i.id }} {{ i.libelle }}</a>
                    </div>
                    <div class="d-flex align-items-center mb-2">
                      @if (i.client.photo) {
                        <img [secureSrc]="i.client.photo" folder="clients" class="kb-logo mr-2" [alt]="i.client.nom" />
                      }
                      <small class="text-muted">{{ i.client.nom }}</small>
                    </div>
                    <div class="d-flex flex-wrap align-items-center justify-content-between">
                      <span>
                        <span class="badge {{ prioriteClass(i.priorite) }} mr-1">{{ prioriteLabel(i.priorite) }}</span>
                        <span class="badge {{ sla(i).cls }}">{{ sla(i).label }}</span>
                      </span>
                      <span class="kb-avatar" [title]="nom(i)">{{ initials(i) }}</span>
                    </div>
                    @if (i.dateEcheance) {
                      <small class="text-muted d-block mt-2"><i class="far fa-calendar-check mr-1"></i>{{ i.dateEcheance | date: 'dd/MM HH:mm' }}</small>
                    }
                  </div>
                } @empty {
                  <div class="kb-empty">Aucun ticket</div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class Kanban {
  protected readonly auth = inject(AuthService);
  private readonly incidents = inject(IncidentService);
  private readonly notifications = inject(NotificationService);

  protected readonly columns: { statut: Statut; label: string; icon: string }[] = [
    { statut: 'OUVERT', label: 'Ouvert', icon: 'fa-exclamation-circle' },
    { statut: 'EN_COURS', label: 'En cours', icon: 'fa-tools' },
    { statut: 'RESOLU', label: 'Résolu', icon: 'fa-check-circle' },
  ];
  protected readonly prioriteClass = prioriteClass;
  protected readonly prioriteLabel = prioriteLabel;
  protected readonly sla = sla;

  protected readonly all = signal<Incident[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly scope = signal<'mine' | 'all'>(this.auth.isAdmin() ? 'all' : 'mine');
  protected readonly query = signal('');
  protected readonly dragOver = signal<Statut | null>(null);
  private dragged: Incident | null = null;

  protected readonly visible = computed(() => {
    const me = this.auth.user()?.id;
    const q = this.query().trim().toLowerCase();
    return this.all().filter(
      (i) =>
        (this.scope() === 'all' || (i.assigne ?? i.user)?.id === me) &&
        (!q || i.libelle.toLowerCase().includes(q) || i.client.nom.toLowerCase().includes(q)),
    );
  });

  constructor() {
    this.incidents.list().subscribe({
      next: (list) => this.all.set(list),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  protected byStatut(s: Statut): Incident[] {
    return this.visible()
      .filter((i) => i.statut === s)
      .sort(
        (a, b) =>
          PRIO_ORDER[a.priorite] - PRIO_ORDER[b.priorite] ||
          new Date(a.dateEcheance ?? a.dateSignalement).getTime() - new Date(b.dateEcheance ?? b.dateSignalement).getTime(),
      );
  }

  protected canDrag(i: Incident): boolean {
    return i.statut !== 'RESOLU' && (this.auth.isAdmin() || (i.assigne ?? i.user)?.id === this.auth.user()?.id);
  }

  protected nom(i: Incident): string {
    const u = i.assigne ?? i.user;
    return `${u.prenom ?? ''} ${u.nom}`.trim();
  }

  protected initials(i: Incident): string {
    const u = i.assigne ?? i.user;
    return `${(u.prenom ?? '').charAt(0)}${u.nom.charAt(0)}`.toUpperCase();
  }

  protected start(event: DragEvent, i: Incident): void {
    if (!this.canDrag(i)) {
      event.preventDefault();
      return;
    }
    this.dragged = i;
    event.dataTransfer?.setData('text/plain', `${i.id}`);
  }

  protected over(event: DragEvent, statut: Statut): void {
    if (this.dragged && nextStatut(this.dragged.statut) === statut) {
      event.preventDefault();
      this.dragOver.set(statut);
    }
  }

  protected drop(event: DragEvent, statut: Statut): void {
    event.preventDefault();
    const card = this.dragged;
    this.dragged = null;
    this.dragOver.set(null);
    if (!card || card.statut === statut) {
      return;
    }
    if (nextStatut(card.statut) !== statut) {
      this.notifications.error(`Transition interdite : ${statutLabel(card.statut)} → ${statutLabel(statut)} (cycle Ouvert → En cours → Résolu).`);
      return;
    }
    this.incidents.changeStatut(card.id, statut).subscribe({
      next: (updated) => {
        this.all.update((l) => l.map((x) => (x.id === updated.id ? updated : x)));
        this.notifications.success(`Ticket #${card.id} : ${statutLabel(statut)}.`);
      },
      error: (err) => this.notifications.error(errorMessage(err)),
    });
  }

  protected readonly statuts = STATUTS;
}
