import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/utils';

function sameValue(group: AbstractControl): ValidationErrors | null {
  return group.get('password')?.value === group.get('confirm')?.value ? null : { mismatch: true };
}

/** Choix d'un nouveau mot de passe à partir du lien reçu par email (?token=...). */
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container pt-6 pb-5">
      <div class="row justify-content-center">
        <div class="col-lg-5 col-md-8">
          <div class="card auth-card auth-single">
            <div class="auth-form w-100">
              <div class="text-center mb-4 auth-logo">
                <span class="h1 font-weight-bold text-primary"><i class="ni ni-support-16 mr-2"></i>ITCare</span>
                <div class="text-muted mt-1"><small>Nouveau mot de passe</small></div>
              </div>
              @if (done()) {
                <div class="alert alert-success">{{ done() }}</div>
                <div class="text-center"><a routerLink="/login" class="btn btn-primary">Se connecter</a></div>
              } @else if (!token) {
                <div class="alert alert-danger">Lien invalide : demandez un nouveau lien de réinitialisation.</div>
                <div class="text-center"><a routerLink="/forgot-password" class="btn btn-primary">Mot de passe oublié</a></div>
              } @else {
                @if (error()) {
                  <div class="alert alert-danger">{{ error() }}</div>
                }
                <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
                  <div class="form-group">
                    <div class="input-group input-group-alternative">
                      <div class="input-group-prepend"><span class="input-group-text"><i class="ni ni-lock-circle-open"></i></span></div>
                      <input class="form-control" placeholder="Nouveau mot de passe (6 caractères min.)" type="password"
                             formControlName="password" autocomplete="new-password" />
                    </div>
                    @if (form.controls.password.touched && form.controls.password.invalid) {
                      <small class="text-danger">6 caractères minimum.</small>
                    }
                  </div>
                  <div class="form-group">
                    <div class="input-group input-group-alternative">
                      <div class="input-group-prepend"><span class="input-group-text"><i class="ni ni-lock-circle-open"></i></span></div>
                      <input class="form-control" placeholder="Confirmer le mot de passe" type="password"
                             formControlName="confirm" autocomplete="new-password" />
                    </div>
                    @if (form.controls.confirm.touched && form.hasError('mismatch')) {
                      <small class="text-danger">Les deux mots de passe ne correspondent pas.</small>
                    }
                  </div>
                  <div class="text-center">
                    <button type="submit" class="btn btn-primary my-3" [disabled]="loading()">
                      {{ loading() ? 'Enregistrement...' : 'Enregistrer' }}
                    </button>
                  </div>
                </form>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ResetPassword {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  protected readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

  protected readonly form = this.fb.nonNullable.group(
    { password: ['', [Validators.required, Validators.minLength(6)]], confirm: ['', Validators.required] },
    { validators: sameValue },
  );
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid || !this.token) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.resetPassword(this.token, this.form.getRawValue().password).subscribe({
      next: (r) => {
        this.done.set(r.message);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
