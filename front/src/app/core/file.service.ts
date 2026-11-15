import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationService } from '../shared/notification';
import { API_URL } from './config';
import { errorMessage } from './utils';

export type FileFolder = 'clients' | 'incidents' | 'rapports' | 'avatars';

/**
 * Les fichiers de l'API exigent le token JWT : une balise <img src> ou un lien ne peuvent pas l'envoyer.
 * On les télécharge donc avec HttpClient (l'interceptor ajoute le token) puis on les affiche via un "blob URL".
 */
@Injectable({ providedIn: 'root' })
export class FileService {
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationService);

  blob(folder: FileFolder, name: string): Observable<Blob> {
    return this.http.get(`${API_URL}/files/${folder}/${encodeURIComponent(name)}`, { responseType: 'blob' });
  }

  /** Ouvre le fichier (ex. PDF) dans un nouvel onglet. */
  open(folder: FileFolder, name: string): void {
    // L'onglet est ouvert tout de suite (action de l'utilisateur) pour ne pas être bloqué par le navigateur
    const tab = window.open('', '_blank');
    this.blob(folder, name).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (tab) {
          tab.location.href = url;
        } else {
          window.location.href = url;
        }
        setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
      },
      error: (err) => {
        tab?.close();
        this.notifications.error(errorMessage(err));
      },
    });
  }

  /** Télécharge le fichier sur le poste de l'utilisateur. */
  download(folder: FileFolder, name: string, downloadName: string): void {
    this.blob(folder, name).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = downloadName;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      },
      error: (err) => this.notifications.error(errorMessage(err)),
    });
  }
}
