import { registerGameKind } from '@/lib/games/registry';
import { AssassinPlayerView, AssassinAdminView } from './AssassinView';
import { SkatePlayerView, SkateAdminView } from './SkateView';

registerGameKind({
  kind: 'assassin',
  label: 'Assassin',
  blurb: 'Secret missions. Get your target doing the deed without them twigging.',
  icon: 'Crosshair',
  newRoundLabel: 'Deal missions',
  PlayerView: AssassinPlayerView,
  AdminView: AssassinAdminView,
});

registerGameKind({
  kind: 'skate',
  label: 'SKATE',
  blurb: 'Someone sets a challenge. Duck it and you collect a letter.',
  icon: 'Dumbbell',
  newRoundLabel: 'Call a set',
  PlayerView: SkatePlayerView,
  AdminView: SkateAdminView,
});
