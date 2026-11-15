import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AccountService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/utils';
import { NotificationService } from '../shared/notification';
import { SecureSrc } from '../shared/secure-src';

function sameValue(group: AbstractControl): ValidationErrors | null {
  return group.get('newPassword')?.value === group.get('confirm')?.value ? null : { mismatch: true };
}

/** Paramètres du compte : profil (nom, prénom, téléphone) et changement de mot de passe. */
@Component({
  selector: 'app-account',
  imports: [ReactiveFormsModule, SecureSrc],
  template: `
    <div class="header bg-gradient-primary pb-8 pt-5 pt-md-8">
      <div class="container-fluid">
        <div class="header-body">
          <h1 class="text-white mb-0">Paramètres du compte</h1>
          <p class="text-white-50 mb-0">Gérez vos informations personnelles et votre mot de passe.</p>
        </div>
      </div>
    </div>

    <div class="container-fluid mt--7">
      <div class="row">
        <div class="col-xl-4 mb-4">
          <div class="card shadow account-hero">
            <div class="account-cover"></div>
            <div class="card-body pt-0">
              <div class="account-avatar-wrap">
                @if (auth.user()?.photo) {
                  <img class="account-avatar" [secureSrc]="auth.user()?.photo" folder="avatars" alt="Photo de profil" />
                } @else {
                  <div class="account-avatar account-initials">{{ initials() }}</div>
                }
                <label class="avatar-edit" title="Changer la photo">
                  <i class="fas fa-camera"></i>
                  <input type="file" hidden accept="image/png,image/jpeg" (change)="onPhoto($event)" />
                </label>
              </div>
              @if (photoError()) {
                <div class="text-danger text-sm mt-2">{{ photoError() }}</div>
              }
              @if (auth.user()?.photo) {
                <button type="button" class="btn btn-sm btn-link text-danger mt-1" (click)="removePhoto()">
                  <i class="fas fa-trash mr-1"></i>Supprimer la photo
                </button>
              } @else {
                <div class="text-muted text-sm mt-2">JPG ou PNG, 2 Mo max</div>
              }
              <h3 class="mt-3 mb-0">{{ fullName() }}</h3>
              <div class="text-muted">{{ auth.user()?.email }}</div>
              <span class="badge badge-pill mt-3 {{ auth.isAdmin() ? 'badge-primary' : 'badge-info' }}">
                <i class="ni ni-badge mr-1"></i>{{ auth.isAdmin() ? 'Administrateur' : 'Collaborateur' }}
              </span>
              <hr class="my-4" />
              <div class="text-left text-sm">
                <div class="mb-2"><i class="ni ni-email-83 text-primary mr-2"></i>{{ auth.user()?.email }}</div>
                <div class="mb-2"><i class="ni ni-mobile-button text-primary mr-2"></i>{{ form.getRawValue().tel || 'Téléphone non renseigné' }}</div>
                <div><i class="ni ni-lock-circle-open text-primary mr-2"></i>Mot de passe chiffré (BCrypt)</div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-8">
          <!-- Profil -->
          <div class="card shadow mb-4">
            <div class="card-header bg-white">
              <h3 class="mb-0"><i class="ni ni-single-02 text-primary mr-2"></i>Informations personnelles</h3>
            </div>
            <div class="card-body">
              @if (profileError()) {
                <div class="alert alert-danger">{{ profileError() }}</div>
              }
              <form [formGroup]="form" (ngSubmit)="saveProfile()" novalidate>
                <div class="row">
                  <div class="col-md-6 form-group">
                    <label class="form-control-label">Nom *</label>
                    <input class="form-control form-control-alternative" formControlName="nom" />
                    @if (form.controls.nom.touched && form.controls.nom.invalid) {
                      <small class="text-danger">Le nom est obligatoire.</small>
                    }
                  </div>
                  <div class="col-md-6 form-group">
                    <label class="form-control-label">Prénom</label>
                    <input class="form-control form-control-alternative" formControlName="prenom" />
                  </div>
                  <div class="col-md-6 form-group">
                    <label class="form-control-label">Email (identifiant de connexion)</label>
                    <input class="form-control form-control-alternative" [value]="auth.user()?.email" disabled />
                  </div>
                  <div class="col-md-6 form-group">
                    <label class="form-control-label">Téléphone</label>
                    <input class="form-control form-control-alternative" formControlName="tel" />
                  </div>
                </div>
                <div class="text-right">
                  <button type="submit" class="btn btn-primary" [disabled]="savingProfile()">
                    <i class="fas fa-save mr-1"></i>{{ savingProfile() ? 'Enregistrement...' : 'Enregistrer' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Mot de passe -->
          <div class="card shadow">
            <div class="card-header bg-white">
              <h3 class="mb-0"><i class="ni ni-lock-circle-open text-primary mr-2"></i>Changer le mot de passe</h3>
            </div>
            <div class="card-body">
              @if (passwordError()) {
                <div class="alert alert-danger">{{ passwordError() }}</div>
              }
              <form [formGroup]="pwdForm" (ngSubmit)="savePassword()" novalidate>
                <div class="form-group">
                  <label class="form-control-label">Mot de passe actuel *</label>
                  <input class="form-control form-control-alternative" type="password"
                         formControlName="currentPassword" autocomplete="current-password" />
                  @if (pwdForm.controls.currentPassword.touched && pwdForm.controls.currentPassword.invalid) {
                    <small class="text-danger">Saisissez votre mot de passe actuel.</small>
                  }
                </div>
                <div class="row">
                  <div class="col-md-6 form-group">
                    <label class="form-control-label">Nouveau mot de passe * (6 caractères min.)</label>
                    <input class="form-control form-control-alternative" type="password"
                           formControlName="newPassword" autocomplete="new-password" />
                    <div class="strength mt-2"><span [style.width.%]="strength().pct" [style.background]="strength().color"></span></div>
                    <small class="text-muted">Force : {{ strength().label }}</small>
                    @if (pwdForm.controls.newPassword.touched && pwdForm.controls.newPassword.invalid) {
                      <div><small class="text-danger">6 caractères minimum.</small></div>
                    }
                  </div>
                  <div class="col-md-6 form-group">
                    <label class="form-control-label">Confirmer le nouveau mot de passe *</label>
                    <input class="form-control form-control-alternative" type="password"
                           formControlName="confirm" autocomplete="new-password" />
                    @if (pwdForm.controls.confirm.touched && pwdForm.hasError('mismatch')) {
                      <small class="text-danger">Les deux mots de passe ne correspondent pas.</small>
                    }
                  </div>
                </div>
                <div class="text-right">
                  <button type="submit" class="btn btn-default" [disabled]="savingPassword()">
                    <i class="fas fa-key mr-1"></i>{{ savingPassword() ? 'Modification...' : 'Modifier le mot de passe' }}
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
export class Account {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(AccountService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  protected readonly form = this.fb.nonNullable.group({
    nom: ['', Validators.required],
    prenom: [''],
    tel: [''],
  });
  protected readonly pwdForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirm: ['', Validators.required],
    },
    { validators: sameValue },
  );

  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly profileError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly photoError = signal<string | null>(null);
  private readonly newPassword = signal('');

  protected readonly strength = computed(() => {
    const p = this.newPassword();
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
    const levels = [
      { label: '—', color: '#e9ecef' },
      { label: 'Faible', color: '#f5365c' },
      { label: 'Moyenne', color: '#fb6340' },
      { label: 'Bonne', color: '#11cdef' },
      { label: 'Excellente', color: '#2dce89' },
    ];
    return { ...levels[p ? Math.max(score, 1) : 0], pct: p ? Math.max(score, 1) * 25 : 0 };
  });

  constructor() {
    this.pwdForm.controls.newPassword.valueChanges.subscribe((v) => this.newPassword.set(v));
    this.api.me().subscribe({
      next: (u) => this.form.patchValue({ nom: u.nom, prenom: u.prenom ?? '', tel: u.tel ?? '' }),
      error: (err) => this.profileError.set(errorMessage(err)),
    });
  }

  protected fullName(): string {
    const u = this.auth.user();
    return u ? `${u.prenom ?? ''} ${u.nom}`.trim() : '';
  }

  protected initials(): string {
    const u = this.auth.user();
    return u ? `${(u.prenom ?? '').charAt(0)}${u.nom.charAt(0)}`.toUpperCase() : '';
  }

  protected onPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.photoError.set(null);
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      this.photoError.set('Format invalide : JPG ou PNG uniquement.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.photoError.set('Image trop volumineuse (2 Mo maximum).');
      return;
    }
    this.api.uploadPhoto(file).subscribe({
      next: (u) => {
        this.auth.updateSessionUser({ photo: u.photo });
        this.notify.success('Photo de profil mise à jour.');
      },
      error: (err) => this.photoError.set(errorMessage(err)),
    });
  }

  protected removePhoto(): void {
    this.api.removePhoto().subscribe({
      next: () => {
        this.auth.updateSessionUser({ photo: null });
        this.notify.success('Photo supprimée.');
      },
      error: (err) => this.photoError.set(errorMessage(err)),
    });
  }

  protected saveProfile(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);
    this.profileError.set(null);
    this.api.updateProfile(this.form.getRawValue()).subscribe({
      next: (u) => {
        this.auth.updateSessionUser({ nom: u.nom, prenom: u.prenom });
        this.notify.success('Profil mis à jour.');
        this.savingProfile.set(false);
      },
      error: (err) => {
        this.profileError.set(errorMessage(err));
        this.savingProfile.set(false);
      },
    });
  }

  protected savePassword(): void {
    if (this.pwdForm.invalid) {
      this.pwdForm.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    this.passwordError.set(null);
    const { currentPassword, newPassword } = this.pwdForm.getRawValue();
    this.api.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.notify.success('Mot de passe modifié.');
        this.pwdForm.reset();
        this.savingPassword.set(false);
      },
      error: (err) => {
        this.passwordError.set(errorMessage(err));
        this.savingPassword.set(false);
      },
    });
  }
}
