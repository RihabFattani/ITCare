import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Client } from '../core/models';
import { errorMessage, validateFile } from '../core/utils';
import { ACTIVITES } from '../shared/labels';
import { NotificationService } from '../shared/notification';
import { SecureSrc } from '../shared/secure-src';

/** Ajout (tous les rôles) et modification (Admin) d'un client, avec upload du logo (JPG/PNG, 2 Mo max). */
@Component({
  selector: 'app-client-form',
  imports: [ReactiveFormsModule, RouterLink, SecureSrc],
  template: `
    <div class="header bg-gradient-primary pb-8 pt-5 pt-md-8">
      <div class="container-fluid">
        <h1 class="text-white mb-0">{{ isEdit ? 'Modifier le client' : 'Nouveau client' }}</h1>
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
              @if (error()) {
                <div class="alert alert-danger">{{ error() }}</div>
              }

              <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group">
                      <label class="form-control-label" for="nom">Nom *</label>
                      <input id="nom" class="form-control form-control-alternative" formControlName="nom" />
                      @if (invalid('nom')) {
                        <small class="text-danger">Le nom est obligatoire.</small>
                      }
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group">
                      <label class="form-control-label" for="activite">Activité</label>
                      <select id="activite" class="form-control form-control-alternative"
                              formControlName="activite">
                        <option value="">-- Choisir --</option>
                        @for (a of activites; track a.value) {
                          <option [value]="a.value">{{ a.label }}</option>
                        }
                      </select>
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group">
                      <label class="form-control-label" for="email">Email *</label>
                      <input id="email" type="email" class="form-control form-control-alternative"
                             formControlName="email" />
                      @if (invalid('email')) {
                        <small class="text-danger">Saisissez une adresse email valide.</small>
                      }
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group">
                      <label class="form-control-label" for="tel">Téléphone</label>
                      <input id="tel" class="form-control form-control-alternative" formControlName="tel" />
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-control-label" for="adresse">Adresse</label>
                  <input id="adresse" class="form-control form-control-alternative" formControlName="adresse" />
                </div>

                <div class="form-group">
                  <label class="form-control-label" for="photo">Logo (JPG ou PNG, 2 Mo max)</label>
                  <input id="photo" type="file" class="form-control-file" accept="image/png,image/jpeg"
                         (change)="onFile($event)" />
                  @if (fileError()) {
                    <small class="text-danger">{{ fileError() }}</small>
                  }
                  <div class="mt-3 d-flex align-items-center">
                    @if (previewUrl(); as url) {
                      <img [src]="url" class="client-logo" alt="Aperçu du logo" />
                    } @else if (existing()?.photo) {
                      <img [secureSrc]="existing()?.photo" folder="clients" class="client-logo" alt="Logo actuel" />
                      @if (auth.isAdmin()) {
                        <button type="button" class="btn btn-sm btn-outline-danger ml-3" (click)="removePhoto()">
                          Supprimer le logo
                        </button>
                      }
                    }
                  </div>
                </div>

                <div class="text-right">
                  <a routerLink="/clients" class="btn btn-secondary">Annuler</a>
                  <button type="submit" class="btn btn-primary" [disabled]="saving()">
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
export class ClientForm {
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly clients = inject(ClientService);
  private readonly notifications = inject(NotificationService);

  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  protected readonly isEdit = !!this.id;
  protected readonly activites = ACTIVITES;

  protected readonly existing = signal<Client | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly fileError = signal<string | null>(null);
  protected readonly previewUrl = signal<string | null>(null);
  private file: File | null = null;

  protected readonly form = this.fb.nonNullable.group({
    nom: ['', Validators.required],
    activite: [''],
    email: ['', [Validators.required, Validators.email]],
    tel: [''],
    adresse: [''],
  });

  constructor() {
    if (this.id) {
      this.clients.get(this.id).subscribe({
        next: (c) => {
          this.existing.set(c);
          this.form.patchValue({
            nom: c.nom,
            activite: c.activite ?? '',
            email: c.email ?? '',
            tel: c.tel ?? '',
            adresse: c.adresse ?? '',
          });
        },
        error: (err) => this.loadError.set(errorMessage(err)),
      });
    }
    inject(DestroyRef).onDestroy(() => this.clearPreview());
  }

  protected invalid(name: 'nom' | 'email'): boolean {
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

  /** RG9 : le back supprime physiquement le fichier. */
  protected removePhoto(): void {
    if (!this.id || !confirm('Supprimer le logo de ce client ?')) {
      return;
    }
    this.clients.removePhoto(this.id).subscribe({
      next: (c) => {
        this.existing.set(c);
        this.notifications.success('Logo supprimé.');
      },
      error: (err) => this.notifications.error(errorMessage(err)),
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const data = new FormData();
    data.append('nom', v.nom.trim());
    data.append('email', v.email.trim());
    data.append('tel', v.tel);
    data.append('adresse', v.adresse);
    data.append('activite', v.activite);
    if (this.file) {
      data.append('photo', this.file);
    }

    this.saving.set(true);
    this.error.set(null);
    const request = this.id ? this.clients.update(this.id, data) : this.clients.create(data);
    request.subscribe({
      next: () => {
        this.notifications.success(this.id ? 'Client modifié.' : 'Client ajouté.');
        this.router.navigate(['/clients']);
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
