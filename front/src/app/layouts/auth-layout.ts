import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/** Cadre des pages publiques (login, register) : fond sombre du template Argon. */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="auth-bubbles"><span></span><span></span><span></span><span></span><span></span></div>
    <div class="main-content">
      <nav class="navbar navbar-top navbar-horizontal navbar-expand-md navbar-dark">
        <div class="container px-4">
          <a class="navbar-brand" routerLink="/login">
            <span class="h2 font-weight-bold text-white"><i class="ni ni-support-16 mr-2"></i>ITCare</span>
          </a>
          <ul class="navbar-nav ml-auto flex-row">
            <li class="nav-item mr-3">
              <a class="nav-link nav-link-icon" routerLink="/register" routerLinkActive="active">
                <i class="ni ni-circle-08"></i>
                <span class="nav-link-inner--text">Inscription</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link nav-link-icon" routerLink="/login" routerLinkActive="active">
                <i class="ni ni-key-25"></i>
                <span class="nav-link-inner--text">Connexion</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>
      <router-outlet />
    </div>
    <footer class="py-5">
      <div class="container">
        <div class="text-center text-muted">
          &copy; {{ year }} <span class="font-weight-bold">ITCare</span> - IT Incident &amp; Support Management System
        </div>
      </div>
    </footer>
  `,
})
export class AuthLayout implements OnInit, OnDestroy {
  protected readonly year = new Date().getFullYear();

  // Le CSS d'Argon utilise ces classes pour le fond sombre et pour retirer la marge du menu latéral
  ngOnInit(): void {
    document.body.classList.add('bg-default');
    document.documentElement.classList.add('auth-layout');
  }

  ngOnDestroy(): void {
    document.body.classList.remove('bg-default');
    document.documentElement.classList.remove('auth-layout');
  }
}
