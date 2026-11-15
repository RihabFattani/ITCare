import { Incident } from '../core/models';

export type SlaLevel = 'done' | 'ok' | 'warn' | 'late' | 'none';

export interface Sla {
  level: SlaLevel;
  label: string;
  cls: string;
}

/** Durée lisible : « 45 min », « 6 h » ou « 3 j ». */
export function formatDelta(hours: number): string {
  const h = Math.abs(hours);
  if (h < 1) {
    return `${Math.max(1, Math.round(h * 60))} min`;
  }
  if (h < 48) {
    return `${Math.round(h)} h`;
  }
  return `${Math.round(h / 24)} j`;
}

/**
 * Suivi du délai (SLA) d'un ticket à partir de son échéance :
 * résolu = terminé ; échéance dépassée = en retard ; moins de 4 h = urgent ; sinon dans les temps.
 */
export function sla(i: Pick<Incident, 'statut' | 'dateEcheance'>, now: Date = new Date()): Sla {
  if (i.statut === 'RESOLU') {
    return { level: 'done', label: 'Terminé', cls: 'badge-success' };
  }
  if (!i.dateEcheance) {
    return { level: 'none', label: 'Sans échéance', cls: 'badge-secondary' };
  }
  const hours = (new Date(i.dateEcheance).getTime() - now.getTime()) / 3_600_000;
  if (hours < 0) {
    return { level: 'late', label: `En retard de ${formatDelta(hours)}`, cls: 'badge-danger' };
  }
  if (hours < 4) {
    return { level: 'warn', label: `Reste ${formatDelta(hours)}`, cls: 'badge-warning' };
  }
  return { level: 'ok', label: `Reste ${formatDelta(hours)}`, cls: 'badge-info' };
}
