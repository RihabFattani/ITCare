import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards';
import { AdminLayout } from './layouts/admin-layout';
import { AuthLayout } from './layouts/auth-layout';

const ADMIN_ONLY = { roles: ['ADMIN'] };

export const routes: Routes = [
  // --- Pages publiques (cadre sombre) : login et inscription ---
  {
    path: '',
    component: AuthLayout,
    canActivate: [guestGuard],
    children: [
      { path: 'login', loadComponent: () => import('./pages/login').then((m) => m.Login) },
      { path: 'register', loadComponent: () => import('./pages/register').then((m) => m.Register) },
      { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password').then((m) => m.ForgotPassword) },
      { path: 'reset-password', loadComponent: () => import('./pages/reset-password').then((m) => m.ResetPassword) },
    ],
  },

  // --- Pages connectées (menu latéral) : authGuard pour tout, roleGuard pour les pages Admin ---
  {
    path: '',
    component: AdminLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        canActivate: [roleGuard],
        data: { ...ADMIN_ONLY, title: 'Tableau de bord' },
        loadComponent: () => import('./pages/dashboard').then((m) => m.Dashboard),
      },

      // Incidents : tout le monde consulte et ajoute ; modifier = Admin
      {
        path: 'incidents',
        data: { title: 'Incidents' },
        loadComponent: () => import('./pages/incident-list').then((m) => m.IncidentList),
      },
      {
        path: 'incidents/new',
        data: { title: 'Nouvel incident' },
        loadComponent: () => import('./pages/incident-form').then((m) => m.IncidentForm),
      },
      {
        path: 'incidents/:id/edit',
        canActivate: [roleGuard],
        data: { ...ADMIN_ONLY, title: 'Modifier un incident' },
        loadComponent: () => import('./pages/incident-form').then((m) => m.IncidentForm),
      },
      {
        path: 'incidents/:id',
        data: { title: "Détail de l'incident" },
        loadComponent: () => import('./pages/incident-detail').then((m) => m.IncidentDetail),
      },

      // Clients
      {
        path: 'clients',
        data: { title: 'Clients' },
        loadComponent: () => import('./pages/client-list').then((m) => m.ClientList),
      },
      {
        path: 'clients/new',
        data: { title: 'Nouveau client' },
        loadComponent: () => import('./pages/client-form').then((m) => m.ClientForm),
      },
      {
        path: 'clients/:id/edit',
        canActivate: [roleGuard],
        data: { ...ADMIN_ONLY, title: 'Modifier un client' },
        loadComponent: () => import('./pages/client-form').then((m) => m.ClientForm),
      },

      // Tableau Kanban : tous les utilisateurs connectés (changement de statut : Admin)
      {
        path: 'kanban',
        data: { title: 'Kanban' },
        loadComponent: () => import('./pages/kanban').then((m) => m.Kanban),
      },

      // Calendrier de pilotage : tous les utilisateurs connectés
      {
        path: 'calendar',
        data: { title: 'Calendrier' },
        loadComponent: () => import('./pages/calendar').then((m) => m.Calendar),
      },

      // Paramètres du compte : tous les utilisateurs connectés
      {
        path: 'account',
        data: { title: 'Paramètres du compte' },
        loadComponent: () => import('./pages/account').then((m) => m.Account),
      },

      {
        path: 'clients/:id',
        data: { title: 'Fiche client' },
        loadComponent: () => import('./pages/client-detail').then((m) => m.ClientDetail),
      },

      // Gestion des utilisateurs : Admin uniquement
      {
        path: 'users',
        canActivate: [roleGuard],
        data: { ...ADMIN_ONLY, title: 'Gestion des utilisateurs' },
        loadComponent: () => import('./pages/user-list').then((m) => m.UserList),
      },
      {
        path: 'users/new',
        canActivate: [roleGuard],
        data: { ...ADMIN_ONLY, title: 'Nouvel utilisateur' },
        loadComponent: () => import('./pages/user-form').then((m) => m.UserForm),
      },
      {
        path: 'users/:id/edit',
        canActivate: [roleGuard],
        data: { ...ADMIN_ONLY, title: "Modifier l'utilisateur" },
        loadComponent: () => import('./pages/user-form').then((m) => m.UserForm),
      },
    ],
  },

  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
