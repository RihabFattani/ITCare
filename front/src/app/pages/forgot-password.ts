import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/utils';

/** Mot de passe oublié : envoie un lien de réinitialisation (valable 1 h) par email. */
@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container pt-6 pb-5">
      <div class="row justify-content-center">
        <div class="col-lg-5 col-md-8">
          <div class="card auth-card auth-single">
            <div class="auth-form w-100">
              <div class="text-center mb-4 auth-logo">
                <span class="h1 font-weight-bold text-primary"><i class="ni ni-support-16 mr-2"></i>ITCare</span>
                <div class="text-muted mt-1"><small>Mot de passe oublié</small></div>
              </div>
              @if (message()) {
                <div class="alert alert-success">{{ message() }}</div>
                <div class="text-center"><a routerLink="/login" class="btn btn-primary">Retour à la connexion</a></div>
              } @else {
                <p class="text-muted text-sm">Saisissez votre email : nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
                @if (error()) {
                  <div class="alert alert-danger">{{ error() }}</div>
                }
                <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
                  <div class="form-group">
                    <div class="input-group input-group-alternative">
                      <div class="input-group-prepend"><span class="input-group-text"><i class="ni ni-email-83"></i></span></div>
                      <input class="form-control" placeholder="Email" type="email" formControlName="email" autocomplete="username" />
                    </div>
                    @if (form.controls.email.touched && form.controls.email.invalid) {
                      <small class="text-danger">Saisissez une adresse email valide.</small>
                    }
                  </div>
                  <div class="text-center">
                    <button type="submit" class="btn btn-primary my-3" [disabled]="loading()">
                      {{ loading() ? 'Envoi...' : 'Envoyer le lien' }}
                    </button>
                  </div>
                </form>
                <div class="text-center"><a routerLink="/login"><small>Retour à la connexion</small></a></div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  protected readonly loading = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.forgotPassword(this.form.getRawValue().email.trim()).subscribe({
      next: (r) => {
        this.message.set(r.message);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
