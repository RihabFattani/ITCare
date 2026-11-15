import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/utils';

function sameValue(group: AbstractControl): ValidationErrors | null {
  return group.get('password')?.value === group.get('confirm')?.value ? null : { mismatch: true };
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container pt-6 pb-5">
      <div class="row justify-content-center">
        <div class="col-xl-10 col-lg-11">
          <div class="card auth-card">
            <div class="auth-photo register">
              <div class="bg"></div>
              <div class="caption">
                <h3>Rejoignez l'équipe ITCare</h3>
                <p class="mb-3 text-white-50">Votre compte sera activé par l'administrateur après votre inscription.</p>
                <span class="chip"><i class="fas fa-user-check mr-1"></i>Validation admin</span>
                <span class="chip"><i class="fas fa-ticket-alt mr-1"></i>Gestion des tickets</span>
              </div>
            </div>
            <div class="auth-form">
              <div class="text-center mb-4 auth-logo">
                <span class="h1 font-weight-bold text-primary"><i class="ni ni-support-16 mr-2"></i>ITCare</span>
                <div class="text-muted mt-1"><small>Créer un compte</small></div>
              </div>
              @if (success()) {
                <div class="alert alert-success" role="alert">
                  <strong>Inscription enregistrée.</strong> {{ success() }}
                </div>
                <div class="text-center">
                  <a routerLink="/login" class="btn btn-primary">Retour à la connexion</a>
                </div>
              } @else {
                @if (error()) {
                  <div class="alert alert-danger" role="alert">{{ error() }}</div>
                }
                <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
                  <div class="row">
                    <div class="col-md-6">
                      <div class="form-group">
                        <input class="form-control form-control-alternative" placeholder="Nom *"
                               formControlName="nom" />
                        @if (form.controls.nom.touched && form.controls.nom.invalid) {
                          <small class="text-danger">Le nom est obligatoire.</small>
                        }
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="form-group">
                        <input class="form-control form-control-alternative" placeholder="Prénom"
                               formControlName="prenom" />
                      </div>
                    </div>
                  </div>
                  <div class="form-group">
                    <div class="input-group input-group-alternative mb-0">
                      <div class="input-group-prepend">
                        <span class="input-group-text"><i class="ni ni-email-83"></i></span>
                      </div>
                      <input class="form-control" placeholder="Email *" type="email" formControlName="email" />
                    </div>
                    @if (form.controls.email.touched && form.controls.email.invalid) {
                      <small class="text-danger">Saisissez une adresse email valide.</small>
                    }
                  </div>
                  <div class="form-group">
                    <div class="input-group input-group-alternative mb-0">
                      <div class="input-group-prepend">
                        <span class="input-group-text"><i class="ni ni-mobile-button"></i></span>
                      </div>
                      <input class="form-control" placeholder="Téléphone" formControlName="tel" />
                    </div>
                  </div>
                  <div class="form-group">
                    <div class="input-group input-group-alternative mb-0">
                      <div class="input-group-prepend">
                        <span class="input-group-text"><i class="ni ni-lock-circle-open"></i></span>
                      </div>
                      <input class="form-control" placeholder="Mot de passe (6 caractères min.) *"
                             type="password" formControlName="password" autocomplete="new-password" />
                    </div>
                    @if (form.controls.password.touched && form.controls.password.invalid) {
                      <small class="text-danger">Le mot de passe doit contenir au moins 6 caractères.</small>
                    }
                  </div>
                  <div class="form-group">
                    <div class="input-group input-group-alternative mb-0">
                      <div class="input-group-prepend">
                        <span class="input-group-text"><i class="ni ni-lock-circle-open"></i></span>
                      </div>
                      <input class="form-control" placeholder="Confirmer le mot de passe *" type="password"
                             formControlName="confirm" autocomplete="new-password" />
                    </div>
                    @if (form.controls.confirm.touched && form.hasError('mismatch')) {
                      <small class="text-danger">Les deux mots de passe ne correspondent pas.</small>
                    }
                  </div>
                  <div class="text-center">
                    <button type="submit" class="btn btn-primary mt-4" [disabled]="loading()">
                      {{ loading() ? 'Envoi...' : 'Créer mon compte' }}
                    </button>
                  </div>
                </form>
              }
              <div class="text-center mt-3">
                <a routerLink="/login"><small>Déjà un compte ? Se connecter</small></a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly form = this.fb.nonNullable.group(
    {
      nom: ['', Validators.required],
      prenom: [''],
      email: ['', [Validators.required, Validators.email]],
      tel: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm: ['', Validators.required],
    },
    { validators: sameValue },
  );
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const { confirm: _confirm, ...data } = this.form.getRawValue();
    this.auth.register({ ...data, email: data.email.trim() }).subscribe({
      next: (res) => {
        this.success.set(res.message);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
