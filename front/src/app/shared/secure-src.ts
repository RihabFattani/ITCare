import { Directive, effect, inject, input, signal } from '@angular/core';
import { FileFolder, FileService } from '../core/file.service';

/**
 * <img [secureSrc]="client.photo" folder="clients"> : affiche une image protégée par le JWT.
 * Le fichier est téléchargé avec le token puis affiché sous forme de blob URL (libéré à la destruction).
 */
@Directive({
  selector: 'img[secureSrc]',
  host: { '[attr.src]': 'url()' },
})
export class SecureSrc {
  private readonly files = inject(FileService);

  readonly secureSrc = input<string | null | undefined>();
  readonly folder = input.required<FileFolder>();

  protected readonly url = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const name = this.secureSrc();
      const folder = this.folder();
      if (!name) {
        this.url.set(null);
        return;
      }
      let objectUrl: string | null = null;
      const sub = this.files.blob(folder, name).subscribe({
        next: (blob) => {
          objectUrl = URL.createObjectURL(blob);
          this.url.set(objectUrl);
        },
        error: () => this.url.set(null),
      });
      onCleanup(() => {
        sub.unsubscribe();
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      });
    });
  }
}
