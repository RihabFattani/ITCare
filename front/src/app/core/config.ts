import { isDevMode } from '@angular/core';

/**
 * URL de l'API Spring Boot.
 * - développement (ng serve, port 4200) : le back tourne sur le port 8081
 * - production : le build Angular est servi par le jar Spring Boot (même origine) => chemin relatif
 */
export const API_URL = isDevMode() ? 'http://localhost:8081/api' : '/api';

/** Tarif horaire fixe (TND) : budget indicatif = durée x tarif (cf. CDC section 5). */
export const TARIF_HORAIRE = 100;
