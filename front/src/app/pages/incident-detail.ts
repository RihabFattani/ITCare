import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IncidentService, UserService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { FileService } from '../core/file.service';
import { Incident, IncidentComment, IncidentEvent, Statut, User } from '../core/models';
import { errorMessage, validateFile } from '../core/utils';
import {
  STATUTS,
  activiteLabel,
  nextStatut,
  nextStatutAction,
  prioriteClass,
  prioriteLabel,
  statutClass,
  statutLabel,
} from '../shared/labels';
import { NotificationService } from '../shared/notification';
import { SecureSrc } from '../shared/secure-src';
import { sla } from '../shared/sla';

/** Fiche d'un incident : infos, cycle de vie, capture d'écran et rapport PDF d'intervention. */
@Component({
  selector: 'app-incident-detail',
  imports: [RouterLink, DatePipe, SecureSrc, FormsModule],
  template: `
    <div class="header bg-gradient-primary pb-8 pt-5 pt-md-8">
      <div class="container-fluid">
        <a routerLink="/incidents" class="text-white-50"><i class="fas fa-arrow-left mr-1"></i> Retour à la liste</a>
        <h1 class="text-white mb-0 mt-2">{{ incident()?.libelle ?? 'Incident' }}</h1>
      </div>
    </div>

    <div class="container-fluid mt--7">
      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      }

      @if (incident(); as i) {
        <div class="row">
          <div class="col-xl-8 mb-4">
            <div class="card shadow">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h3 class="mb-0">Incident #{{ i.id }}</h3>
                <div>
                  <span class="badge badge-pill {{ prioriteClass(i.priorite) }} mr-2">
                    Priorité {{ prioriteLabel(i.priorite).toLowerCase() }}
                  </span>
                  <span class="badge badge-pill {{ sla(i).cls }} mr-2" title="Suivi du délai"><i class="far fa-clock mr-1"></i>{{ sla(i).label }}</span>
                  <span class="badge badge-pill badge-statut {{ statutClass(i.statut) }}">{{ statutLabel(i.statut) }}</span>
                </div>
              </div>
              <div class="card-body">
                <!-- Cycle de vie (Fig.2 du CDC) -->
                <div class="d-flex align-items-center justify-content-center flex-wrap mb-4">
                  @for (s of statuts; track s; let last = $last) {
                    <span class="badge badge-pill badge-statut px-3 py-2"
                          [class]="s === i.statut ? statutClass(s) : 'badge-secondary'">{{ statutLabel(s) }}</span>
                    @if (!last) {
                      <i class="fas fa-long-arrow-alt-right mx-3 text-muted"></i>
                    }
                  }
                </div>

                <h6 class="heading-small text-muted mb-3">Description</h6>
                <p class="mb-4" style="white-space: pre-line">{{ i.description || 'Aucune description.' }}</p>

                <div class="row">
                  <div class="col-md-4 mb-3">
                    <h6 class="heading-small text-muted mb-1">Durée estimée</h6>
                    <span class="h4">{{ i.duree }} h</span>
                  </div>
                  <div class="col-md-4 mb-3">
                    <h6 class="heading-small text-muted mb-1">Budget estimé</h6>
                    <span class="h4">{{ i.budget }} TND</span>
                  </div>
                  <div class="col-md-4 mb-3">
                    <h6 class="heading-small text-muted mb-1">Signalé le</h6>
                    <span class="h4">{{ i.dateSignalement | date: 'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-4 mb-3">
                    <h6 class="heading-small text-muted mb-1">Échéance</h6>
                    <span class="h4">{{ i.dateEcheance ? (i.dateEcheance | date: 'dd/MM/yyyy HH:mm') : '—' }}</span>
                  </div>
                  <div class="col-md-8 mb-3">
                    <h6 class="heading-small text-muted mb-1">Assigné à</h6>
                    <span class="h4">{{ (i.assigne ?? i.user).prenom }} {{ (i.assigne ?? i.user).nom }}</span>
                    @if (auth.isAdmin() && i.statut !== 'RESOLU') {
                      <select class="form-control form-control-sm d-inline-block w-auto ml-3" [ngModel]="''"
                              (ngModelChange)="assign(i, $event)">
                        <option value="">Réaffecter...</option>
                        @for (u of users(); track u.id) {
                          <option [value]="u.id">{{ u.prenom }} {{ u.nom }}</option>
                        }
                      </select>
                    }
                  </div>
                </div>
                <p class="text-muted mb-0">
                  Enregistré par <strong>{{ i.user.prenom }} {{ i.user.nom }}</strong> ({{ i.user.email }})
                </p>
              </div>
            </div>

            <div class="card shadow mt-4">
              <div class="card-header"><h3 class="mb-0"><i class="far fa-comments mr-2 text-primary"></i>Commentaires ({{ comments().length }})</h3></div>
              <div class="card-body">
                @for (c of comments(); track c.id) {
                  <div class="comment">
                    <span class="comment-avatar">{{ initials(c.auteur) }}</span>
                    <div class="comment-body">
                      <div><strong>{{ c.auteur.prenom }} {{ c.auteur.nom }}</strong>
                        <small class="text-muted ml-2">{{ c.date | date: 'dd/MM/yyyy HH:mm' }}</small></div>
                      <div style="white-space: pre-line">{{ c.contenu }}</div>
                    </div>
                  </div>
                } @empty {
                  <p class="text-muted">Aucun commentaire pour le moment.</p>
                }
                <form class="mt-3" (ngSubmit)="sendComment()">
                  <textarea class="form-control form-control-alternative" rows="2" name="comment"
                            placeholder="Ajouter un commentaire..." [(ngModel)]="newComment" maxlength="2000"></textarea>
                  <div class="text-right mt-2">
                    <button type="submit" class="btn btn-primary btn-sm" [disabled]="!newComment.trim() || busy()">
                      <i class="fas fa-paper-plane mr-1"></i>Publier
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div class="card shadow mt-4">
              <div class="card-header"><h3 class="mb-0"><i class="fas fa-stream mr-2 text-primary"></i>Historique</h3></div>
              <div class="card-body">
                <ul class="timeline">
                  @for (e of history(); track e.id) {
                    <li>
                      <span class="tl-dot tl-{{ e.type }}"></span>
                      <div>
                        <strong>{{ eventLabel(e.type) }}</strong> — {{ e.detail }}
                        <div><small class="text-muted">
                          {{ e.date | date: 'dd/MM/yyyy HH:mm' }}@if (e.auteur) { · {{ e.auteur.prenom }} {{ e.auteur.nom }} }
                        </small></div>
                      </div>
                    </li>
                  } @empty {
                    <li class="text-muted">Aucun événement.</li>
                  }
                </ul>
              </div>
            </div>

            <div class="card shadow mt-4">
              <div class="card-header"><h3 class="mb-0">Capture d'écran</h3></div>
              <div class="card-body">
                @if (i.captureEcran) {
                  <img [secureSrc]="i.captureEcran" folder="incidents" class="capture-preview"
                       alt="Capture d'écran de l'incident" />
                } @else {
                  <span class="text-muted">Aucune capture d'écran jointe.</span>
                }
              </div>
            </div>
          </div>

          <div class="col-xl-4">
            <div class="card shadow mb-4">
              <div class="card-header"><h3 class="mb-0">Client</h3></div>
              <div class="card-body text-center">
                @if (i.client.photo) {
                  <img [secureSrc]="i.client.photo" folder="clients" class="client-logo mb-3" alt="Logo" />
                }
                <h4>{{ i.client.nom }}</h4>
                <span class="badge badge-info">{{ activite(i.client.activite) }}</span>
                <p class="text-muted mt-3 mb-0">
                  {{ i.client.email }}<br />{{ i.client.tel }}<br />{{ i.client.adresse }}
                </p>
              </div>
            </div>

            <div class="card shadow mb-4">
              <div class="card-header"><h3 class="mb-0">Rapport d'intervention</h3></div>
              <div class="card-body">
                @if (i.rapportPdf) {
                  <p class="mb-3"><i class="fas fa-file-pdf text-danger mr-2"></i>Rapport PDF disponible</p>
                  <button type="button" class="btn btn-sm btn-primary" (click)="openRapport(i)">
                    <i class="fas fa-external-link-alt mr-1"></i> Ouvrir
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-primary" (click)="downloadRapport(i)">
                    <i class="fas fa-download mr-1"></i> Télécharger
                  </button>
                  @if (auth.isAdmin()) {
                    <button type="button" class="btn btn-sm btn-outline-danger" (click)="removeRapport(i)">
                      <i class="fas fa-trash"></i>
                    </button>
                  }
                } @else {
                  <p class="text-muted">Aucun rapport pour le moment.</p>
                }

                @if (auth.isAdmin()) {
                  <hr />
                  @if (i.statut === 'RESOLU') {
                    <label class="form-control-label" for="rapport">
                      {{ i.rapportPdf ? 'Remplacer le rapport' : 'Ajouter le rapport' }} (PDF, 5 Mo max)
                    </label>
                    <input id="rapport" type="file" class="form-control-file" accept="application/pdf"
                           [disabled]="busy()" (change)="uploadRapport(i, $event)" />
                  } @else {
                    <small class="text-muted">
                      Le rapport PDF pourra être ajouté par l'Admin une fois l'incident résolu.
                    </small>
                  }
                }
              </div>
            </div>

            @if (canAdvance(i)) {
              <div class="card shadow mb-4">
                <div class="card-header"><h3 class="mb-0">Mon ticket</h3></div>
                <div class="card-body">
                  @if (next(i); as n) {
                    <button type="button" class="btn btn-primary btn-block" [disabled]="busy()"
                            (click)="advance(i, n)">{{ action(i) }}</button>
                  } @else {
                    <span class="text-muted">Ticket résolu.</span>
                  }
                </div>
              </div>
            }

            @if (auth.isAdmin()) {
              <div class="card shadow">
                <div class="card-header"><h3 class="mb-0">Actions (Admin)</h3></div>
                <div class="card-body">
                  @if (i.statut !== 'RESOLU' && (i.assigne ?? i.user).id !== auth.user()?.id) {
                    <button type="button" class="btn btn-success btn-block mb-2" [disabled]="busy()"
                            (click)="takeCharge(i)">
                      <i class="fas fa-hand-paper mr-1"></i> Prendre en charge
                    </button>
                  }
                  @if (i.statut !== 'RESOLU') {
                    <a [routerLink]="['/incidents', i.id, 'edit']" class="btn btn-outline-warning btn-block">
                      <i class="fas fa-edit mr-1"></i> Modifier
                    </a>
                  }
                  <button type="button" class="btn btn-outline-danger btn-block" (click)="remove(i)">
                    <i class="fas fa-trash mr-1"></i> Supprimer
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      } @else if (!error()) {
        <div class="card shadow"><div class="card-body text-center text-muted">Chargement...</div></div>
      }
    </div>
  `,
})
export class IncidentDetail {
  protected readonly auth = inject(AuthService);
  private readonly incidents = inject(IncidentService);
  private readonly files = inject(FileService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly statuts = STATUTS;
  protected readonly statutLabel = statutLabel;
  protected readonly statutClass = statutClass;
  protected readonly prioriteLabel = prioriteLabel;
  protected readonly prioriteClass = prioriteClass;
  protected readonly activite = activiteLabel;
  protected readonly sla = sla;
  protected canAdvance(i: Incident): boolean {
    return this.auth.isAdmin() || (i.assigne ?? i.user)?.id === this.auth.user()?.id;
  }

  /** Prise en charge : l'Admin s'affecte le ticket. */
  protected takeCharge(i: Incident): void {
    const me = this.auth.user()?.id;
    if (me) {
      this.run(this.incidents.assign(i.id, me), 'Ticket pris en charge.', () => this.loadActivity());
    }
  }
  protected readonly comments = signal<IncidentComment[]>([]);
  protected readonly history = signal<IncidentEvent[]>([]);
  protected readonly users = signal<User[]>([]);
  protected newComment = '';
  private readonly userApi = inject(UserService);
  protected readonly next = (i: Incident) => nextStatut(i.statut);
  protected readonly action = (i: Incident) => nextStatutAction(i.statut);

  protected readonly incident = signal<Incident | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  constructor() {
    this.incidents.get(this.id).subscribe({
      next: (i) => this.incident.set(i),
      error: (err) => this.error.set(errorMessage(err)),
    });
    this.loadActivity();
    if (this.auth.isAdmin()) {
      this.userApi.list().subscribe({ next: (u) => this.users.set(u.filter((x) => x.enabled)), error: () => undefined });
    }
  }

  protected initials(u: User): string {
    return `${(u.prenom ?? '').charAt(0)}${u.nom.charAt(0)}`.toUpperCase();
  }

  protected eventLabel(type: string): string {
    const labels: Record<string, string> = {
      CREATION: 'Création', STATUT: 'Statut', ASSIGNATION: 'Assignation', ECHEANCE: 'Échéance',
      MODIFICATION: 'Modification', COMMENTAIRE: 'Commentaire',
    };
    return labels[type] ?? type;
  }

  protected sendComment(): void {
    const text = this.newComment.trim();
    if (!text) {
      return;
    }
    this.busy.set(true);
    this.incidents.addComment(this.id, text).subscribe({
      next: () => {
        this.newComment = '';
        this.busy.set(false);
        this.loadActivity();
      },
      error: (err) => {
        this.notifications.error(errorMessage(err));
        this.busy.set(false);
      },
    });
  }

  protected assign(i: Incident, userId: string): void {
    if (userId) {
      this.run(this.incidents.assign(i.id, userId), 'Ticket réaffecté.', () => this.loadActivity());
    }
  }

  private loadActivity(): void {
    this.incidents.comments(this.id).subscribe({ next: (l) => this.comments.set(l), error: () => undefined });
    this.incidents.history(this.id).subscribe({ next: (l) => this.history.set(l), error: () => undefined });
  }

  protected advance(i: Incident, statut: Statut): void {
    this.run(this.incidents.changeStatut(i.id, statut), `Statut : « ${statutLabel(statut)} ».`, () => this.loadActivity());
  }

  protected uploadRapport(i: Incident, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const problem = validateFile(file, 'pdf');
    if (problem) {
      this.notifications.error(problem);
      input.value = '';
      return;
    }
    this.run(this.incidents.uploadRapport(i.id, file), 'Rapport PDF enregistré.', () => (input.value = ''));
  }

  protected removeRapport(i: Incident): void {
    if (confirm('Supprimer le rapport PDF ?')) {
      this.run(this.incidents.removeRapport(i.id), 'Rapport supprimé.');
    }
  }

  protected openRapport(i: Incident): void {
    if (i.rapportPdf) {
      this.files.open('rapports', i.rapportPdf);
    }
  }

  protected downloadRapport(i: Incident): void {
    if (i.rapportPdf) {
      this.files.download('rapports', i.rapportPdf, `rapport-incident-${i.id}.pdf`);
    }
  }

  protected remove(i: Incident): void {
    if (!confirm(`Supprimer définitivement l'incident « ${i.libelle} » ?`)) {
      return;
    }
    this.incidents.delete(i.id).subscribe({
      next: () => {
        this.notifications.success('Incident supprimé.');
        this.router.navigate(['/incidents']);
      },
      error: (err) => this.notifications.error(errorMessage(err)),
    });
  }

  /** Exécute une action qui renvoie l'incident mis à jour. */
  private run(request: ReturnType<IncidentService['get']>, success: string, done?: () => void): void {
    this.busy.set(true);
    request.subscribe({
      next: (updated) => {
        this.incident.set(updated);
        this.notifications.success(success);
        this.busy.set(false);
        done?.();
      },
      error: (err) => {
        this.notifications.error(errorMessage(err));
        this.busy.set(false);
        done?.();
      },
    });
  }
}
