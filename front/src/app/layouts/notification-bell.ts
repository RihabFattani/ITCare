import { DatePipe } from '@angular/common';
import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, of, startWith, switchMap, timer } from 'rxjs';
import { NotificationApiService } from '../core/api.service';
import { AppNotification } from '../core/models';

/** Cloche de notifications : actualisée toutes les 30 s, avec compteur de non lues. */
@Component({
  selector: 'app-notification-bell',
  imports: [DatePipe],
  template: `
    <div class="bell">
      <button type="button" class="bell-btn" (click)="toggle($event)" aria-label="Notifications">
        <i class="fas fa-bell" [class.ring]="unread() > 0"></i>
        @if (unread() > 0) {
          <span class="bell-count">{{ unread() > 9 ? '9+' : unread() }}</span>
        }
      </button>
      @if (open()) {
        <div class="bell-panel">
          <div class="bell-head">
            <strong>Notifications</strong>
            @if (unread() > 0) {
              <button type="button" class="btn btn-link btn-sm p-0" (click)="readAll()">Tout marquer comme lu</button>
            }
          </div>
          <div class="bell-list">
            @for (n of items(); track n.id) {
              <a class="bell-item" [class.unread]="!n.lu" (click)="go(n)">
                <i class="fas fa-circle-notch"></i>
                <div>
                  <div>{{ n.message }}</div>
                  <small class="text-muted">{{ n.date | date: 'dd/MM HH:mm' }}</small>
                </div>
              </a>
            } @empty {
              <div class="text-center text-muted py-4">Aucune notification.</div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class NotificationBell {
  private readonly api = inject(NotificationApiService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly items = signal<AppNotification[]>([]);
  protected readonly open = signal(false);
  protected readonly unread = computed(() => this.items().filter((n) => !n.lu).length);

  constructor() {
    timer(0, 30_000)
      .pipe(
        startWith(0),
        switchMap(() => this.api.list().pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      .subscribe((list) => {
        if (list) {
          this.items.set(list);
        }
      });
  }

  protected toggle(event: Event): void {
    event.stopPropagation();
    this.open.update((v) => !v);
  }

  protected go(n: AppNotification): void {
    this.open.set(false);
    if (!n.lu) {
      this.api.read(n.id).subscribe(() => this.items.update((l) => l.map((x) => (x.id === n.id ? { ...x, lu: true } : x))));
    }
    if (n.lien) {
      this.router.navigateByUrl(n.lien);
    }
  }

  protected readAll(): void {
    this.api.readAll().subscribe(() => this.items.update((l) => l.map((x) => ({ ...x, lu: true }))));
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }
}
