import type { ComponentType } from 'react';
import type { GameKind, GameSnapshot, PublicAttendee } from '@/lib/types';

export interface GameViewProps {
  snapshot: GameSnapshot;
  me: PublicAttendee;
  allAttendees: PublicAttendee[];
}

export interface GameKindDefinition {
  kind: GameKind;
  label: string;
  /** One line shown on the admin "new game" picker. */
  blurb: string;
  /** lucide-react icon name, resolved by the consuming component. */
  icon: string;
  /** What the admin's "new round" button says for this kind. */
  newRoundLabel: string;
  PlayerView: ComponentType<GameViewProps>;
  AdminView: ComponentType<GameViewProps>;
}

const registry = new Map<GameKind, GameKindDefinition>();

export function registerGameKind(def: GameKindDefinition) {
  registry.set(def.kind, def);
}

export function getGameKind(kind: GameKind): GameKindDefinition | undefined {
  return registry.get(kind);
}

export function listGameKinds(): GameKindDefinition[] {
  return [...registry.values()];
}
