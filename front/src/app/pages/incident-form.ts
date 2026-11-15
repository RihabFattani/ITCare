import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientService, IncidentService, UserService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { TARIF_HORAIRE } from '../core/config';
import { Client, Incident, User } from '../core/models';
import { errorMessage, validateFile } from '../core/utils';
import { PRIORITES, prioriteLabel } from '../shared/labels';
import { NotificationService } from '../shared/notification';
import { SecureSrc } from '../shared/secure-src';

/**
 * Ajout (tous les rôles) et modification (Admin) d'un incident.
 * RG4 : budget >= 0 et durée > 0 ; RG5 : un client existant est obligatoire.
 * La capture d'écran est envoyée en multipart (FormData) : JPG/PNG, 2 Mo max.
 */
@Component({
  selector: 'app-incident-form',
  imports: [ReactiveFormsModule, RouterLink, SecureSrc],
  template: `
    <div class="header bg-gradient-primary pb-8 pt-5 pt-md-8">
      <div class="container-fluid">
        <h1 class="text-white mb-0">{{ isEdit ? "Modifier l'incident" : 'Nouvel incident' }}</h1>
      </div>
    </div>

    <div class="container-fluid mt--7">
      <div class="row justify-content-center">
        <div class="col-xl-8">
          <div class="card shadow">
            <div class="card-body">
              @if (loadError()) {
                <div class="alert alert-danger">{{ loadError() }}</div>
              }
              @if (resolved()) {
                <div class="alert alert-warning">
                  Cet incident est <strong>résolu</strong> : il n'est plus modifiable (RG7).
                </div>
              }
              @if (error()) {
                <div class="alert alert-danger">{{ error() }}</div>
              }

              <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
                <div class="form-group">
                  <label class="form-control-label" for="libelle">Libellé *</label>
                  <input id="libelle" class="form-control form-control-alternative" formControlName="libelle"
                         placeholder="Ex. : Perte d'accès à la base de données MySQL" />
                  @if (invalid('libelle')) {
                    <small class="text-danger">Le libellé est obligatoire.</small>
                  }
                </div>

                <div class="form-group">
                  <label class="form-control-label" for="description">Description</label>
                  <textarea id="description" rows="4" class="form-control form-control-alternative"
                            formControlName="description"
                            placeholder="Décrivez le problème rencontré par le client"></textarea>
                </div>

                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group">
                      <label class="form-control-label" for="client">Client *</label>
                      <select id="client" class="form-control form-control-alternative" formControlName="idClient">
                        <option value="">-- Choisir un client --</option>
                        @for (c of clients(); track c.id) {
                          <option [value]="c.id">{{ c.nom }}</option>
                        }
                      </select>
                      @if (invalid('idClient')) {
                        <small class="text-danger">Le client est obligatoire (RG5).</small>
                      }
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group">
                      <label class="form-control-label" for="priorite">Priorité *</label>
                      <select id="priorite" class="form-control form-control-alternative" formControlName="priorite">
                        @for (p of priorites; track p) {
                          <option [value]="p">{{ prioriteLabel(p) }}</option>
                        }
                      </select>
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group">
                      <label class="form-control-label" for="duree">Durée estimée (heures) *</label>
                      <input id="duree" type="number" min="1" class="form-control form-control-alternative"
                             formControlName="duree" />
                      @if (invalid('duree')) {
                        <small class="text-danger">La durée doit être supérieure à 0 (RG4).</small>
                      }
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group">
                      <label class="form-control-label" for="budget">Budget estimé (TND) *</label>
                      <input id="budget" type="number" min="0" class="form-control form-control-alternative"
                             formControlName="budget" (input)="budgetEdited = true" />
                      <small class="text-muted">Proposé automatiquement : {{ tarif }} TND par heure.</small>
                      @if (invalid('budget')) {
                        <br /><small class="text-danger">Le budget doit être supérieur ou égal à 0 (RG4).</small>
                      }
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group">
                      <label class="form-control-label" for="echeance">Échéance (date limite)</label>
                      <input id="echeance" type="datetime-local" class="form-control form-control-alternative"
                             formControlName="dateEcheance" [disabled]="!auth.isAdmin() && isEdit" />
                      <small class="text-muted">
                        {{ auth.isAdmin() ? 'Vide = date de signalement + durée estimée.' : "Calculée automatiquement (signalement + durée) ; l'Admin peut la modifier." }}
                      </small>
                    </div>
                  </div>
                  @if (auth.isAdmin()) {
                    <div class="col-md-6">
                      <div class="form-group">
                        <label class="form-control-label" for="assigne">Assigné à</label>
                        <select id="assigne" class="form-control form-control-alternative" formControlName="idAssigne">
                          <option value="">-- Moi-même --</option>
                          @for (u of users(); track u.id) {
                            <option [value]="u.id">{{ u.prenom }} {{ u.nom }}</option>
                          }
                        </select>
                      </div>
                    </div>
                  }
                </div>

                <div class="form-group">
                  <label class="form-control-label" for="capture">Capture d'écran (JPG ou PNG, 2 Mo max)</label>
                  <input id="capture" type="file" class="form-control-file" accept="image/png,image/jpeg"
                         (change)="onFile($event)" />
                  @if (fileError()) {
                    <small class="text-danger">{{ fileError() }}</small>
                  }
                  @if (previewUrl(); as url) {
                    <div class="mt-3"><img [src]="url" class="capture-preview" alt="Aperçu" /></div>
                  } @else if (existing()?.captureEcran) {
                    <div class="mt-3">
                      <img [secureSrc]="existing()?.captureEcran" folder="incidents" class="capture-preview"
                           alt="Capture actuelle" />
                      <div><small class="text-muted">Capture actuelle (choisissez un fichier pour la remplacer).</small></div>
                    </div>
                  }
                </div>

                <div class="text-right">
                  <a routerLink="/incidents" class="btn btn-secondary">Annuler</a>
                  <button type="submit" class="btn btn-primary" [disabled]="saving() || resolved()">
                    {{ saving() ? 'Enregistrement...' : 'Enregistrer' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class IncidentForm {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly incidents = inject(IncidentService);
  private readonly clientService = inject(ClientService);
  private readonly notifications = inject(NotificationService);
  protected readonly auth = inject(AuthService);
  private readonly userApi = inject(UserService);
  protected readonly users = signal<User[]>([]);

  protected readonly priorites = PRIORITES;
  protected readonly prioriteLabel = prioriteLabel;
  protected readonly tarif = TARIF_HORAIRE;

  private readonly id = this.route.snapshot.paramMap.get('id');
  protected readonly isEdit = !!this.id;

  protected readonly clients = signal<Client[]>([]);
  protected readonly existing = signal<Incident | null>(null);
  protected readonly resolved = computed(() => this.existing()?.statut === 'RESOLU');
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly fileError = signal<string | null>(null);
  protected readonly previewUrl = signal<string | null>(null);

  protected budgetEdited = false;
  private file: File | null = null;

  protected readonly form = this.fb.nonNullable.group({
    libelle: ['', Validators.required],
    description: [''],
    idClient: ['', Validators.required],
    priorite: ['MOYENNE', Validators.required],
    duree: [1, [Validators.required, Validators.min(1)]],
    budget: [TARIF_HORAIRE, [Validators.required, Validators.min(0)]],
    dateEcheance: [''],
    idAssigne: [''],
  });

  constructor() {
    this.clientService.list().subscribe({
      next: (c) => this.clients.set(c),
      error: (err) => this.loadError.set(errorMessage(err)),
    });

    if (this.auth.isAdmin()) {
      this.userApi.list().subscribe({ next: (u) => this.users.set(u.filter((x) => x.enabled)), error: () => undefined });
    }
    // Client présélectionné depuis la fiche client (?clientId=)
    const preselected = this.route.snapshot.queryParamMap.get('clientId');
    if (preselected && !this.id) {
      this.form.patchValue({ idClient: preselected });
    }

    // Budget proposé = durée x tarif horaire, tant que l'utilisateur ne l'a pas modifié à la main
    this.form.controls.duree.valueChanges.pipe(takeUntilDestroyed()).subscribe((duree) => {
      if (!this.budgetEdited && duree > 0) {
        this.form.controls.budget.setValue(duree * TARIF_HORAIRE, { emitEvent: false });
      }
    });

    if (this.id) {
      this.budgetEdited = true;
      this.incidents.get(this.id).subscribe({
        next: (i) => {
          this.existing.set(i);
          this.form.patchValue({
            libelle: i.libelle,
            description: i.description ?? '',
            idClient: `${i.client.id}`,
            priorite: i.priorite,
            duree: i.duree,
            budget: i.budget,
            dateEcheance: i.dateEcheance ? i.dateEcheance.slice(0, 16) : '',
            idAssigne: i.assigne ? `${i.assigne.id}` : '',
          });
          if (i.statut === 'RESOLU') {
            this.form.disable();
          }
        },
        error: (err) => this.loadError.set(errorMessage(err)),
      });
    }

    inject(DestroyRef).onDestroy(() => this.clearPreview());
  }

  protected invalid(name: 'libelle' | 'idClient' | 'duree' | 'budget'): boolean {
    const c = this.form.controls[name];
    return c.touched && c.invalid;
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.clearPreview();
    this.file = null;
    this.fileError.set(null);
    if (!file) {
      return;
    }
    const problem = validateFile(file, 'image');
    if (problem) {
      this.fileError.set(problem);
      input.value = '';
      return;
    }
    this.file = file;
    this.previewUrl.set(URL.createObjectURL(file));
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const data = new FormData();
    data.append('libelle', v.libelle.trim());
    data.append('description', v.description);
    data.append('budget', `${v.budget}`);
    data.append('duree', `${v.duree}`);
    data.append('priorite', v.priorite);
    data.append('idClient', v.idClient);
    if (v.dateEcheance) {
      data.append('dateEcheance', v.dateEcheance.length === 16 ? `${v.dateEcheance}:00` : v.dateEcheance);
    }
    if (v.idAssigne && this.auth.isAdmin()) {
      data.append('idAssigne', v.idAssigne);
    }
    if (this.file) {
      data.append('captureEcran', this.file);
    }

    this.saving.set(true);
    this.error.set(null);
    const request = this.id ? this.incidents.update(this.id, data) : this.incidents.create(data);
    request.subscribe({
      next: (saved) => {
        this.notifications.success(this.id ? 'Incident modifié.' : 'Incident enregistré (statut OUVERT).');
        this.router.navigate(['/incidents', saved.id]);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.saving.set(false);
      },
    });
  }

  private clearPreview(): void {
    const url = this.previewUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.previewUrl.set(null);
  }
}
