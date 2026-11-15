import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface MenuItem {
  path: string;
  title: string;
  icon: string;
}

/** Menu latéral (template Argon) : les entrées dépendent du rôle (RG : menu adapté à l'Admin ou au Collaborateur). */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar navbar-vertical navbar-expand-md navbar-light bg-white" id="sidenav-main">
      <div class="container-fluid">
        <button class="navbar-toggler" type="button" aria-controls="sidenav-collapse-main"
                (click)="isCollapsed.set(!isCollapsed())">
          <span class="navbar-toggler-icon"></span>
        </button>

        <a class="navbar-brand pt-0" [routerLink]="auth.homeUrl()">
          <span class="h2 font-weight-bold text-primary"><i class="ni ni-support-16 mr-2"></i>ITCare</span>
        </a>

        <div class="navbar-collapse collapse" [class.show]="!isCollapsed()" id="sidenav-collapse-main">
          <div class="navbar-collapse-header d-md-none">
            <div class="row">
              <div class="col-6 collapse-brand">
                <span class="h3 font-weight-bold text-primary">ITCare</span>
              </div>
              <div class="col-6 collapse-close">
                <button type="button" class="navbar-toggler" (click)="isCollapsed.set(true)">
                  <span></span>
                  <span></span>
                </button>
              </div>
            </div>
          </div>

          <ul class="navbar-nav">
            @for (item of menu(); track item.path) {
              <li class="nav-item">
                <a class="nav-link" [routerLink]="item.path" routerLinkActive="active"
                   (click)="isCollapsed.set(true)">
                  <i class="ni {{ item.icon }}"></i> {{ item.title }}
                </a>
              </li>
            }
          </ul>

          <hr class="my-3" />
          <h6 class="navbar-heading text-muted">Compte</h6>
          <ul class="navbar-nav mb-md-3">
            <li class="nav-item">
              <a class="nav-link" routerLink="/account" routerLinkActive="active" (click)="isCollapsed.set(true)">
                <i class="ni ni-settings-gear-65 text-default"></i> Paramètres du compte
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link cursor-pointer" (click)="logout()">
                <i class="ni ni-user-run"></i> Se déconnecter
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `,
})
export class Sidebar {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isCollapsed = signal(true);

  protected readonly menu = computed<MenuItem[]>(() => {
    const admin = this.auth.isAdmin();
    return [
      ...(admin ? [{ path: '/dashboard', title: 'Tableau de bord', icon: 'ni-tv-2 text-primary' }] : []),
      { path: '/incidents', title: 'Incidents', icon: 'ni-support-16 text-orange' },
      { path: '/kanban', title: 'Kanban', icon: 'ni-bullet-list-67 text-info' },
      { path: '/calendar', title: 'Calendrier', icon: 'ni-calendar-grid-58 text-red' },
      { path: '/clients', title: 'Clients', icon: 'ni-building text-info' },
      ...(admin ? [{ path: '/users', title: 'Utilisateurs', icon: 'ni-single-02 text-yellow' }] : []),
    ];
  });

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
