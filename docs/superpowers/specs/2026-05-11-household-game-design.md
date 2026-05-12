# HouseHold - Game Design Spec

**Date:** 2026-05-11
**Designer:** Mario (8 years old)
**Built with:** Claude

## What It Is

A 3D tower defense game in the browser. The player defends a house from zombies, aliens, and natural disasters.

## Tech

- HTML, JavaScript, Three.js
- Loaded from CDN. No build tools.
- Opens by double-clicking `index.html` in Chrome.
- Single page game.

## The Map

- Square play area with a house in the center.
- Four paths lead to the house from north, south, east, and west.
- Open sky above for flying enemies.
- Camera looks down at a tilted angle for a 3D feel.

## Enemies

| Enemy | Moves on | Speed | Health | Notes |
|-------|----------|-------|--------|-------|
| Zombie | Ground paths | Slow | Low | Most common |
| Alien | Sky (flies straight to house) | Fast | Medium | Cannot be hit by cannons |
| Alien Mothership (boss) | Sky | Slow | Very high | Only appears on wave 10. Big target. Cannot be hit by cannons. |

Enemies spawn at the edge of the map and head for the house. If they reach the house, the house loses health.

## Towers (Defenses)

| Tower | Targets | Rate | Damage | Cost |
|-------|---------|------|--------|------|
| Cannon | Ground zombies only | Slow | High | Medium |
| Turret | Air aliens only | Fast | Low | Medium |
| Trap | Ground enemies that step on it | One-shot per enemy | High | Low |

Towers are placed on empty tiles outside of paths. Traps go on path tiles. Player clicks an empty spot, then picks a tower from a small menu.

## Disasters (Random Events Between Waves)

- **Earthquake:** Screen shakes for a few seconds. One or two random towers are destroyed.
- **Flood:** Half the map is covered in water for 30 seconds. Traps in flooded tiles do not work during this time.
- **Volcano:** Lava blocks one random path for 30 seconds. Enemies use the remaining paths.

Disasters are announced before they happen so the player can prepare.

## Waves

- 10 waves total.
- Each wave has more enemies than the last.
- Mix of zombies and aliens grows as waves go on.
- Between waves: a short break, plus a possible disaster.
- **Wave 10 is the boss wave:** the Alien Mothership appears along with regular enemies. Kill it to win.

## Economy

- Player starts with a pile of coins.
- Each enemy killed gives coins.
- Coins buy towers from the menu.
- No way to sell or upgrade towers in v1.

## Win and Lose

- **Win:** Survive all 10 waves and defeat the Alien Mothership.
- **Lose:** House health hits 0.

## Visual Style

- Simple shapes first. Cubes, spheres, cones. Bright colors.
- House is a small box with a roof.
- Better art can come later.

## What's Not in v1 (Save for Later)

- Multiple maps
- Upgrades for towers
- Selling towers
- More enemy types
- More bosses (only Alien Mothership in v1)
- Save / load
- Sound effects and music
- Multiplayer
