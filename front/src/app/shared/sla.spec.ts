import { formatDelta, sla } from './sla';
import { nextStatut } from './labels';

const NOW = new Date('2026-11-15T10:00:00');
const inHours = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString().slice(0, 19);

describe('sla', () => {
  it('un ticket résolu est « terminé », même en retard', () => {
    const r = sla({ statut: 'RESOLU', dateEcheance: inHours(-50) }, NOW);
    expect(r.level).toBe('done');
  });

  it('sans échéance, le ticket n’a pas de délai', () => {
    expect(sla({ statut: 'OUVERT', dateEcheance: null }, NOW).level).toBe('none');
  });

  it('échéance dépassée : en retard', () => {
    const r = sla({ statut: 'EN_COURS', dateEcheance: inHours(-3) }, NOW);
    expect(r.level).toBe('late');
    expect(r.label).toContain('retard');
  });

  it('moins de 4 h restantes : urgent', () => {
    expect(sla({ statut: 'OUVERT', dateEcheance: inHours(2) }, NOW).level).toBe('warn');
  });

  it('plus de 4 h restantes : dans les temps', () => {
    expect(sla({ statut: 'OUVERT', dateEcheance: inHours(30) }, NOW).level).toBe('ok');
  });
});

describe('formatDelta', () => {
  it('affiche des minutes, des heures ou des jours', () => {
    expect(formatDelta(0.5)).toBe('30 min');
    expect(formatDelta(6)).toBe('6 h');
    expect(formatDelta(72)).toBe('3 j');
  });
});

describe('cycle de vie des statuts (RG2)', () => {
  it('OUVERT -> EN_COURS -> RESOLU, puis plus rien', () => {
    expect(nextStatut('OUVERT')).toBe('EN_COURS');
    expect(nextStatut('EN_COURS')).toBe('RESOLU');
    expect(nextStatut('RESOLU')).toBeNull();
  });
});
