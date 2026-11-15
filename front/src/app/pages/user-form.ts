import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from '../core/api.service';
import { RoleName } from '../core/models';
import { errorMessage } from '../core/utils';
import { NotificationService } from '../shared/notification';

/** Au moins un rôle doit être coché. */
function atLeastOneRole(group: AbstractControl): ValidationErrors | null {
  return group.get('admin')?.value || group.get('collaborateur')?.value ? null : { noRole: true };
}

/** Création / modification d'un utilisateur (Admin). */
@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="header bg-gradient-primary pb-8 pt-5 pt-md-8">
      <div class="container-fluid">
        <h1 class="text-white mb-0">{{ isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur' }}</h1>
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
                      <label class="form-control-label" for="prenom">Prénom</label>
                      <input id="prenom" class="form-control form-control-alternative" formControlName="prenom" />
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group">
                      <label class="form-control-label" for="email">Email (identifiant de connexion) *</label>
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
                  <label class="form-control-label" for="password">
                    Mot de passe {{ isEdit ? '(laisser vide pour ne pas le changer)' : '*' }}
                  </label>
                  <input id="password" type="password" class="form-control form-control-alternative"
                         formControlName="password" autocomplete="new-password" />
                  @if (invalid('password')) {
                    <small class="text-danger">6 caractères minimum.</small>
                  }
                </div>

                <div class="form-group">
                  <label class="form-control-label d-block">Rôles *</label>
                  <div class="custom-control custom-checkbox custom-control-inline">
                    <input class="custom-control-input" id="roleAdmin" type="checkbox" formControlName="admin" />
                    <label class="custom-control-label" for="roleAdmin">ADMIN (responsable technique)</label>
                  </div>
                  <div class="custom-control custom-checkbox custom-control-inline">
                    <input class="custom-control-input" id="roleCollab" type="checkbox"
                           formControlName="collaborateur" />
                    <label class="custom-control-label" for="roleCollab">COLLABORATEUR (agent de support)</label>
                  </div>
                  @if (form.touched && form.hasError('noRole')) {
                    <div><small class="text-danger">Choisissez au moins un rôle.</small></div>
                  }
                </div>

                <div class="form-group">
                  <div class="custom-control custom-checkbox">
                    <input class="custom-control-input" id="enabled" type="checkbox" formControlName="enabled" />
                    <label class="custom-control-label" for="enabled">Compte actif (peut se connecter)</label>
                  </div>
                </div>

                <div class="text-right">
                  <a routerLink="/users" class="btn btn-secondary">Annuler</a>
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
export class UserForm {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(UserService);
  private readonly notifications = inject(NotificationService);

  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  protected readonly isEdit = !!this.id;

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly loadError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      nom: ['', Validators.required],
      prenom: [''],
      email: ['', [Validators.required, Validators.email]],
      tel: [''],
      // Obligatoire à la création ; facultatif à la modification (vide = inchangé)
      password: ['', this.id ? [Validators.minLength(6)] : [Validators.required, Validators.minLength(6)]],
      admin: [false],
      collaborateur: [true],
      enabled: [true],
    },
    { validators: atLeastOneRole },
  );

  constructor() {
    if (this.id) {
      this.service.get(this.id).subscribe({
        next: (u) =>
          this.form.patchValue({
            nom: u.nom,
            prenom: u.prenom ?? '',
            email: u.email,
            tel: u.tel ?? '',
            admin: u.roles.some((r) => r.libelle === 'ADMIN'),
            collaborateur: u.roles.some((r) => r.libelle === 'COLLABORATEUR'),
            enabled: u.enabled,
          }),
        error: (err) => this.loadError.set(errorMessage(err)),
      });
    }
  }

  protected invalid(name: 'nom' | 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.touched && c.invalid;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const roles: RoleName[] = [...(v.admin ? ['ADMIN' as const] : []), ...(v.collaborateur ? ['COLLABORATEUR' as const] : [])];
    const payload = {
      email: v.email.trim(),
      password: v.password || undefined,
      nom: v.nom.trim(),
      prenom: v.prenom,
      tel: v.tel,
      roles,
      enabled: v.enabled,
    };

    this.saving.set(true);
    this.error.set(null);
    const request = this.id ? this.service.update(this.id, payload) : this.service.create(payload);
    request.subscribe({
      next: () => {
        this.notifications.success(this.id ? 'Utilisateur modifié.' : 'Utilisateur créé.');
        this.router.navigate(['/users']);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.saving.set(false);
      },
    });
  }
}
