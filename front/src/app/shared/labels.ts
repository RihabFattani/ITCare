import { Priorite, Statut } from '../core/models';

export const STATUTS: Statut[] = ['OUVERT', 'EN_COURS', 'RESOLU'];
export const PRIORITES: Priorite[] = ['BASSE', 'MOYENNE', 'HAUTE'];

/** Secteurs d'activité des clients (valeur stockée en base -> libellé affiché). */
export const ACTIVITES: { value: string; label: string }[] = [
  { value: 'banque', label: 'Banque' },
  { value: 'sante', label: 'Santé' },
  { value: 'education', label: 'Éducation' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'autre', label: 'Autre' },
];

export function activiteLabel(value?: string | null): string {
  return ACTIVITES.find((a) => a.value === value?.toLowerCase())?.label ?? value ?? '-';
}

export function statutLabel(s: Statut): string {
  return { OUVERT: 'Ouvert', EN_COURS: 'En cours', RESOLU: 'Résolu' }[s];
}

/** Badge de statut : rouge = OUVERT, orange = EN_COURS, vert = RESOLU (cf. CDC). */
export function statutClass(s: Statut): string {
  return { OUVERT: 'badge-danger', EN_COURS: 'badge-warning', RESOLU: 'badge-success' }[s];
}

export function prioriteLabel(p: Priorite): string {
  return { BASSE: 'Basse', MOYENNE: 'Moyenne', HAUTE: 'Haute' }[p];
}

export function prioriteClass(p: Priorite): string {
  return { BASSE: 'badge-info', MOYENNE: 'badge-primary', HAUTE: 'badge-dark' }[p];
}

/** Prochaine étape autorisée du cycle de vie (RG2), ou null si l'incident est résolu. */
export function nextStatut(s: Statut): Statut | null {
  return s === 'OUVERT' ? 'EN_COURS' : s === 'EN_COURS' ? 'RESOLU' : null;
}

export function nextStatutAction(s: Statut): string {
  return s === 'OUVERT' ? 'Prendre en charge' : 'Marquer comme résolu';
}
