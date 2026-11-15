import { HttpErrorResponse } from '@angular/common/http';

/** Extrait un message lisible d'une erreur HTTP (le back renvoie { status, message }). */
export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return "Serveur injoignable : vérifiez que l'API Spring Boot est démarrée.";
    }
    const body = err.error;
    if (body && typeof body === 'object' && typeof body['message'] === 'string') {
      return body['message'];
    }
    return `Erreur ${err.status}`;
  }
  return 'Une erreur inattendue est survenue.';
}

/** Contrôle côté client d'un fichier (le back refait les mêmes contrôles). Retourne un message d'erreur ou null. */
export function validateFile(file: File, kind: 'image' | 'pdf'): string | null {
  if (kind === 'image') {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      return 'Format invalide : seuls JPG et PNG sont acceptés.';
    }
    if (file.size > 2 * 1024 * 1024) {
      return 'Image trop volumineuse : 2 Mo maximum.';
    }
    return null;
  }
  if (file.type !== 'application/pdf') {
    return 'Format invalide : seul le PDF est accepté.';
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'Fichier trop volumineux : 5 Mo maximum.';
  }
  return null;
}
