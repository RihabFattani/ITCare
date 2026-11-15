import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './shared/theme';
import { Toasts } from './shared/toasts';

@Component({
  imports: [RouterOutlet, Toasts],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  // Applique tout de suite le thème (clair / sombre) mémorisé
  constructor() {
    inject(ThemeService);
  }
}
