import { Component, inject } from '@angular/core';
import { NotificationService } from './notification';

@Component({
  selector: 'app-toasts',
  template: `
    <div class="itcare-toasts">
      @for (t of notifications.toasts(); track t.id) {
        <div class="alert alert-{{ t.type }} alert-dismissible shadow" role="alert">
          <span class="alert-text">{{ t.message }}</span>
          <button type="button" class="close" aria-label="Fermer" (click)="notifications.dismiss(t.id)">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      }
    </div>
  `,
})
export class Toasts {
  protected readonly notifications = inject(NotificationService);
}
