export type Statut = 'OUVERT' | 'EN_COURS' | 'RESOLU';
export type Priorite = 'BASSE' | 'MOYENNE' | 'HAUTE';
export type RoleName = 'ADMIN' | 'COLLABORATEUR';

export interface Role {
  id: number;
  libelle: RoleName;
}

export interface User {
  id: number;
  email: string;
  nom: string;
  prenom?: string | null;
  tel?: string | null;
  photo?: string | null;
  enabled: boolean;
  roles: Role[];
}

export interface Client {
  id: number;
  nom: string;
  tel?: string | null;
  email?: string | null;
  adresse?: string | null;
  activite?: string | null;
  photo?: string | null;
}

export interface Incident {
  id: number;
  libelle: string;
  description?: string | null;
  budget: number;
  duree: number;
  priorite: Priorite;
  statut: Statut;
  dateSignalement: string;
  captureEcran?: string | null;
  rapportPdf?: string | null;
  dateEcheance?: string | null;
  client: Client;
  /** Créateur du ticket */
  user: User;
  /** Collaborateur à qui le ticket est affecté */
  assigne?: User | null;
}

export interface IncidentComment {
  id: number;
  auteur: User;
  contenu: string;
  date: string;
}

export interface IncidentEvent {
  id: number;
  auteur?: User | null;
  type: string;
  detail?: string | null;
  date: string;
}

export interface AppNotification {
  id: number;
  message: string;
  lien?: string | null;
  lu: boolean;
  date: string;
}

export interface IncidentFilters {
  q?: string;
  statut?: Statut | '';
  priorite?: Priorite | '';
  clientId?: number | string | '';
}

export interface Stats {
  total: number;
  ouverts: number;
  enCours: number;
  resolus: number;
  hautePrioriteOuverts: number;
  parStatut: Record<Statut, number>;
  parPriorite: Record<Priorite, number>;
  parClient: { clientId: number; client: string; total: number }[];
}

export interface SessionUser {
  id: number;
  email: string;
  nom: string;
  prenom?: string | null;
  photo?: string | null;
  roles: RoleName[];
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: SessionUser;
}

export interface RegisterData {
  email: string;
  password: string;
  nom: string;
  prenom?: string;
  tel?: string;
}

export interface UserPayload {
  email: string;
  password?: string;
  nom: string;
  prenom?: string;
  tel?: string;
  roles: RoleName[];
  enabled: boolean;
}
