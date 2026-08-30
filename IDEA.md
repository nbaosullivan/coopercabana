A stag do organisation app

## Games

The Tasks tab includes a generic, kind-agnostic games engine (`lib/games/`,
`app/games/actions.ts`, `components/games/`) with two games built on it:
Assassin (secret missions, resolved by target confirmation) and SKATE
(classic challenge/letter rules). Everything shared lives in the engine;
each game is just data plus a small module.

To add a third game kind: add the `kind` value to the `games.kind` CHECK
constraint in `schema.sql`, write a generator in `lib/games/<kind>.ts`
(with tests), build two React views (`<Kind>PlayerView` /
`<Kind>AdminView`), and call `registerGameKind()` for it in
`components/games/index.ts`. Nothing else in the engine changes.
