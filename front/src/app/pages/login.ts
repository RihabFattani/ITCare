import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/utils';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container pt-6 pb-5">
      <div class="row justify-content-center">
        <div class="col-xl-9 col-lg-10">
          <div class="card auth-card">
            <div class="auth-photo">
              <div class="bg"></div>
              <div class="caption">
                <h3>Bienvenue sur ITCare</h3>
                <p class="mb-3 text-white-50">Suivi des incidents informatiques et du support client.</p>
                <span class="chip"><i class="fas fa-bolt mr-1"></i>Rapide</span>
                <span class="chip"><i class="fas fa-shield-alt mr-1"></i>Sécurisé</span>
                <span class="chip"><i class="fas fa-headset mr-1"></i>Support 24/7</span>
              </div>
            </div>
            <div class="auth-form">
              <div class="text-center mb-4 auth-logo">
                <span class="h1 font-weight-bold text-primary"><i class="ni ni-support-16 mr-2"></i>ITCare</span>
                <div class="text-muted mt-1"><small>Connectez-vous avec votre compte</small></div>
              </div>

              @if (expired) {
                <div class="alert alert-warning">Votre session a expiré, veuillez vous reconnecter.</div>
              }
              @if (error()) {
                <div class="alert alert-danger" role="alert">{{ error() }}</div>
              }

              <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
                <div class="form-group mb-3">
                  <div class="input-group input-group-alternative">
                    <div class="input-group-prepend">
                      <span class="input-group-text"><i class="ni ni-email-83"></i></span>
                    </div>
                    <input class="form-control" placeholder="Email" type="email" formControlName="email"
                           autocomplete="username" />
                  </div>
                  @if (form.controls.email.touched && form.controls.email.invalid) {
                    <small class="text-danger">Saisissez une adresse email valide.</small>
                  }
                </div>
                <div class="form-group">
                  <div class="input-group input-group-alternative">
                    <div class="input-group-prepend">
                      <span class="input-group-text"><i class="ni ni-lock-circle-open"></i></span>
                    </div>
                    <input class="form-control" placeholder="Mot de passe" type="password"
                           formControlName="password" autocomplete="current-password" />
                  </div>
                  @if (form.controls.password.touched && form.controls.password.invalid) {
                    <small class="text-danger">Le mot de passe est obligatoire.</small>
                  }
                </div>
                <div class="text-center">
                  <button type="submit" class="btn btn-primary my-4" [disabled]="loading()">
                    {{ loading() ? 'Connexion...' : 'Se connecter' }}
                  </button>
                </div>
              </form>
              <div class="text-center mt-2">
                <a routerLink="/forgot-password"><small>Mot de passe oublié ?</small></a>
                <span class="text-muted mx-2">·</span>
                <a routerLink="/register"><small>Pas de compte ? Créer un compte</small></a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly expired = this.route.snapshot.queryParamMap.get('expired') === '1';

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email.trim(), password).subscribe({
      next: () => {
        // Retour à la page demandée avant la connexion (uniquement un chemin interne)
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const safe = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//');
        this.router.navigateByUrl(safe ? returnUrl : this.auth.homeUrl());
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
