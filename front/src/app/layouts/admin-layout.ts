import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from './footer';
import { Navbar } from './navbar';
import { Sidebar } from './sidebar';

/** Cadre des pages connectées : menu latéral + barre du haut + contenu + pied de page. */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, Sidebar, Navbar, Footer],
  template: `
    <app-sidebar />
    <div class="main-content">
      <app-navbar />
      <router-outlet />
      <div class="container-fluid">
        <app-footer />
      </div>
    </div>
  `,
})
export class AdminLayout {}
