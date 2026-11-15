import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { SecureSrc } from '../shared/secure-src';
import { ThemeService } from '../shared/theme';
import { NotificationBell } from './notification-bell';

/** Barre du haut : titre de la page courante (data.title de la route) + menu utilisateur. */
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, SecureSrc, NotificationBell],
  template: `
    <nav class="navbar navbar-top navbar-expand-md navbar-dark" id="navbar-main">
      <div class="container-fluid">
        <span class="h4 mb-0 text-white text-uppercase d-none d-lg-inline-block">{{ title() }}</span>

        <ul class="navbar-nav align-items-center ml-auto">
          <li class="nav-item mr-2">
            <button type="button" class="bell-btn" (click)="theme.toggle()" [title]="theme.dark() ? 'Mode clair' : 'Mode sombre'"
                    aria-label="Basculer le thème">
              <i class="fas" [class.fa-moon]="!theme.dark()" [class.fa-sun]="theme.dark()"></i>
            </button>
          </li>
          <li class="nav-item mr-3"><app-notification-bell /></li>
          <li class="nav-item dropdown">
            <a class="nav-link pr-0 cursor-pointer" role="button" (click)="toggle($event)">
              <div class="media align-items-center">
                @if (auth.user()?.photo) {
                  <img class="avatar-photo" [secureSrc]="auth.user()?.photo" folder="avatars" [alt]="initials()" />
                } @else {
                  <span class="avatar avatar-sm rounded-circle bg-white text-primary font-weight-bold">{{ initials() }}</span>
                }
                <div class="media-body ml-2 d-none d-lg-block">
                  <span class="mb-0 text-sm font-weight-bold">{{ fullName() }}</span>
                </div>
              </div>
            </a>
            <div class="dropdown-menu dropdown-menu-arrow dropdown-menu-right" [class.show]="open()">
              <div class="dropdown-header noti-title">
                <h6 class="text-overflow m-0">{{ auth.isAdmin() ? 'Administrateur' : 'Collaborateur' }}</h6>
                <small class="text-muted">{{ auth.user()?.email }}</small>
              </div>
              <div class="dropdown-divider"></div>
              <a class="dropdown-item cursor-pointer" routerLink="/account">
                <i class="ni ni-settings-gear-65"></i>
                <span>Paramètres du compte</span>
              </a>
              <a class="dropdown-item cursor-pointer" (click)="logout()">
                <i class="ni ni-user-run"></i>
                <span>Se déconnecter</span>
              </a>
            </div>
          </li>
        </ul>
      </div>
    </nav>
  `,
})
export class Navbar {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly title = signal(this.currentTitle());
  protected readonly open = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.title.set(this.currentTitle());
        this.open.set(false);
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

  protected toggle(event: Event): void {
    event.stopPropagation();
    this.open.update((v) => !v);
  }

  /** Ferme le menu quand on clique ailleurs. */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  /** Parcourt l'arbre des routes actives pour trouver le dernier data.title défini. */
  private currentTitle(): string {
    let route = this.router.routerState.snapshot.root;
    let title = '';
    while (route) {
      if (route.data['title']) {
        title = route.data['title'];
      }
      route = route.firstChild as typeof route;
    }
    return title;
  }
}
