import { Injectable, signal } from '@angular/core';

const KEY = 'itcare_theme';

/** Mode sombre : classe « theme-dark » sur <body>, choix mémorisé dans le navigateur. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal(this.initial());

  constructor() {
    this.apply(this.dark());
  }

  toggle(): void {
    const next = !this.dark();
    this.dark.set(next);
    localStorage.setItem(KEY, next ? 'dark' : 'light');
    this.apply(next);
  }

  private initial(): boolean {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      return saved === 'dark';
    }
    return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private apply(dark: boolean): void {
    document.body.classList.toggle('theme-dark', dark);
  }
}
