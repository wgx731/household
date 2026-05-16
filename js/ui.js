import { startMusic, toggleMute, isMuted, setTrack, sfxWarning } from './audio.js';

export function createUi(game) {
  const root = document.getElementById('hud');
  root.style.position = 'fixed';
  root.style.top = '8px';
  root.style.left = '8px';
  root.style.padding = '8px 12px';
  root.style.background = 'rgba(0,0,0,0.55)';
  root.style.color = '#fff';
  root.style.fontFamily = 'sans-serif';
  root.style.borderRadius = '6px';
  root.innerHTML = `
    <div>HouseHold</div>
    <div>House HP: <span id="hp"></span></div>
    <div>Player HP: <span id="phP"></span> <span id="shelter" style="color:#7df">shelter</span></div>
    <div>Coins: <span id="coins"></span></div>
    <div>Wave: <span id="wave"></span> / 10</div>
    <div>State: <span id="state"></span></div>
    <div style="margin-top:6px;font-size:12px;opacity:.8">Tap to walk. Buttons bottom-right place towers and jump.</div>
  `;
  const $ = id => document.getElementById(id);

  let endShown = false;
  const endLayer = document.createElement('div');
  endLayer.style.cssText = `
    position: fixed; inset: 0; display: none; place-items: center;
    background: rgba(0,0,0,0.7); color: #fff; font-family: sans-serif;
    font-size: 36px; text-align: center;
  `;
  endLayer.innerHTML = `<div><div id="endMsg"></div>
    <div style="margin-top:12px"><button id="restartBtn" style="font-size:18px">Play again</button></div></div>`;
  document.body.appendChild(endLayer);
  endLayer.querySelector('#restartBtn').addEventListener('click', () => location.reload());

  const introLayer = document.createElement('div');
  introLayer.style.cssText = `
    position: fixed; inset: 0;
    display: flex; align-items: flex-start; justify-content: center;
    background: rgba(0,0,0,0.88); color: #fff; font-family: sans-serif;
    z-index: 100; overflow-y: auto; padding: 20px 0;
    -webkit-overflow-scrolling: touch;
  `;
  introLayer.innerHTML = `
    <div style="max-width: 540px; padding: 18px; line-height: 1.4; font-size: 14px">
      <h1 style="margin: 0 0 4px; color: #ffd54f">HouseHold</h1>
      <div style="opacity:.85;margin-bottom:10px">Defend the house across 10 waves on a 15&times;15 map with 4 spawn paths. Beat the alien <b>mothership</b> on wave 10. Lose if the <b>house HP</b> (100) or <b>player HP</b> (70) hits 0.</div>

      <div style="margin:10px 0;padding:8px 0;border-top:1px solid #333;border-bottom:1px solid #333">
        <div style="margin-bottom:6px;color:#7df">Difficulty (scales enemy HP &amp; speed)</div>
        <div id="diffRow" style="display:flex;gap:8px"></div>
      </div>

      <div style="color:#7df;margin:8px 0 2px">Move &amp; act</div>
      <div>WASD / arrows or tap the map to walk; the player faces where it walks. <b>Space</b> jumps &mdash; while airborne you dodge enemies, bombers, archer arrows, and lava. <b>1 / 2 / 3</b> drop cannon / turret / trap at your tile. <b>4</b> buys the gun (50c). <b>5</b> throws a bomb (25c). Step into the house for shelter.</div>

      <div style="color:#7df;margin:8px 0 2px">Towers (kill enemies, earn coins)</div>
      <div><b style="color:#aaa">Cannon</b> 20c, range 3, hits ground &middot; <b style="color:#6af">Turret</b> 25c, range 4, hits air &middot; <b style="color:#f73">Trap</b> 10c on path tiles, one 25-dmg hit then gone</div>

      <div style="color:#7df;margin:8px 0 2px">Player weapons</div>
      <div><b style="color:#ddd">Gun</b> auto-fires the nearest enemy (8 dmg, range 3) and disappears after 3 waves. <b style="color:#c22">Bomb</b> drops at your feet with a 1s fuse, then a 60-dmg blast in 1.5 tiles. The <b style="color:#c22">red smoke</b> is from your bomb; <b style="color:#888">gray smoke</b> is from a Bomber detonation.</div>

      <div style="color:#7df;margin:8px 0 2px">Enemies (which weapon kills each)</div>
      <div><b>Zombie</b> slow ground &rarr; <b style="color:#aaa">cannon</b>/<b style="color:#f73">trap</b>. <b>Alien</b> fast flier &rarr; <b style="color:#6af">turret</b>. <b>Mothership</b> wave-10 boss flier &rarr; <b style="color:#6af">turret</b>. <b style="color:#7a3">Bomber</b> proximity blast (30 dmg in 1 tile) hurts <i>everything</i> nearby including its own kind. <b>Archer</b> shoots arrows (8 dmg, range 4) at you.</div>

      <div style="color:#7df;margin:8px 0 2px">Disasters (3s alarm warning before they hit)</div>
      <div><b>Earthquake</b> screen shakes, up to 2 of your towers break. <b>Flood</b> &mdash;10 HP on start unless sheltered, then &minus;5/0.8s drain outside; traps disabled 30s; <b style="color:#ffd54f">house is the only safe place</b>. <b>Volcano</b> blocks one spawn path for 10s and pours <b style="color:#f73">lava</b>; touching it costs &minus;30 HP, traps on lava are destroyed; jump over to be safe.</div>

      <div style="color:#7df;margin:8px 0 2px">Sound</div>
      <div>Music swaps between calm / battle / boss / victory / defeat. Each weapon and disaster has its own SFX; an alarm beeps at the start of every disaster. <b>🔊</b> top-right mutes everything.</div>

      <div style="margin-top:14px;text-align:center">
        <button id="introStartBtn" style="font-size:18px;padding:10px 26px;cursor:pointer;border-radius:8px;border:none;background:#ffd54f;color:#111;font-weight:700">Start playing</button>
      </div>
    </div>
  `;
  document.body.appendChild(introLayer);

  const diffRow = introLayer.querySelector('#diffRow');
  const diffBtns = {};
  function paintDiff() {
    for (const k of Object.keys(diffBtns)) {
      const sel = game.difficulty === k;
      diffBtns[k].style.background = sel ? '#ffd54f' : '#444';
      diffBtns[k].style.color = sel ? '#111' : '#fff';
      diffBtns[k].style.fontWeight = sel ? '700' : '500';
    }
  }
  for (const k of ['easy', 'normal', 'hard']) {
    const b = document.createElement('button');
    b.textContent = k[0].toUpperCase() + k.slice(1);
    b.style.cssText = `
      flex:1; padding:8px 0; font-size:14px; border:1px solid #666; border-radius:6px;
      background:#444; color:#fff; cursor:pointer; touch-action:manipulation;
    `;
    b.addEventListener('click', () => { game.setDifficulty(k); paintDiff(); });
    diffRow.appendChild(b);
    diffBtns[k] = b;
  }
  paintDiff();

  introLayer.querySelector('#introStartBtn').addEventListener('click', () => {
    introLayer.style.display = 'none';
    startMusic();
  });

  const actions = document.createElement('div');
  actions.style.cssText = `
    position: fixed; right: 14px; bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    display: grid; grid-template-columns: repeat(3, 60px); gap: 8px;
    z-index: 30; user-select: none; touch-action: manipulation;
  `;
  function actBtn(key, label, bg, onPress) {
    const b = document.createElement('button');
    b.innerHTML = `<span style="font-size:10px;opacity:.75;display:block;line-height:1">${key}</span><span style="font-size:11px;font-weight:700;line-height:1.1">${label}</span>`;
    b.style.cssText = `
      width: 60px; height: 60px; padding:0;
      background: ${bg}; color: white; border: 2px solid rgba(255,255,255,.25);
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,.55);
      cursor: pointer; touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
      transition: transform .05s ease-out, filter .05s ease-out;
    `;
    const press = () => { b.style.transform = 'scale(0.92)'; b.style.filter = 'brightness(1.2)'; };
    const release = () => { b.style.transform = ''; b.style.filter = ''; };
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); press(); onPress(); });
    b.addEventListener('pointerup', release);
    b.addEventListener('pointercancel', release);
    b.addEventListener('pointerleave', release);
    return b;
  }
  actions.appendChild(actBtn('1', 'Cannon', '#777', () => game.placeTowerAtPlayer('cannon')));
  actions.appendChild(actBtn('2', 'Turret', '#36c', () => game.placeTowerAtPlayer('turret')));
  actions.appendChild(actBtn('3', 'Trap',   '#c63', () => game.placeTowerAtPlayer('trap')));
  actions.appendChild(actBtn('4', 'Gun',    '#aaa', () => game.buyGun()));
  actions.appendChild(actBtn('5', 'Bomb',   '#222', () => game.throwBomb()));
  actions.appendChild(actBtn('␣', 'Jump',   '#3a3', () => game.playerJump()));
  document.body.appendChild(actions);

  const waveBtn = document.createElement('button');
  waveBtn.textContent = 'Start Wave';
  waveBtn.style.cssText = `
    position: fixed; left: 16px; bottom: calc(24px + env(safe-area-inset-bottom, 0px));
    padding: 16px 22px; font-size: 18px; font-weight: 700;
    background: #ffb300; color: #111; border: 2px solid rgba(0,0,0,.2);
    border-radius: 14px; box-shadow: 0 3px 10px rgba(0,0,0,.55);
    z-index: 30; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
    cursor: pointer;
  `;
  waveBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); game.startNextWave(); });
  document.body.appendChild(waveBtn);

  const muteBtn = document.createElement('button');
  function paintMute() { muteBtn.textContent = isMuted() ? '🔇' : '🔊'; }
  paintMute();
  muteBtn.style.cssText = `
    position: fixed; top: 12px; right: 12px;
    width: 44px; height: 44px; font-size: 20px;
    background: rgba(0,0,0,0.55); color: #fff; border: none; border-radius: 50%;
    z-index: 30; cursor: pointer; touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  `;
  muteBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); toggleMute(); paintMute(); });
  document.body.appendChild(muteBtn);

  const warnBanner = document.createElement('div');
  warnBanner.style.cssText = `
    position: fixed; top: 64px; left: 50%; transform: translateX(-50%);
    padding: 10px 20px; font-family: sans-serif; font-weight: 700; font-size: 20px;
    background: rgba(220,30,30,0.85); color: #fff; border: 2px solid #fff;
    border-radius: 10px; z-index: 35; text-align: center; display: none;
    box-shadow: 0 0 20px rgba(255,0,0,.6); pointer-events: none;
  `;
  document.body.appendChild(warnBanner);

  function trackForGame() {
    if (game.state === 'won') return 'victory';
    if (game.state === 'lost') return 'defeat';
    if (game.state === 'wave') {
      if (game.activeEnemies.some(e => e.type === 'mothership')) return 'boss';
      return 'battle';
    }
    return 'calm';
  }

  let lastPending = null;
  function refresh() {
    setTrack(trackForGame());
    if (game.pendingDisaster && game.pendingDisaster !== lastPending) {
      sfxWarning();
    }
    lastPending = game.pendingDisaster;
    if (game.pendingDisaster) {
      const secs = Math.max(0, game.pendingDisasterTimer / 1000).toFixed(1);
      const name = game.pendingDisaster.toUpperCase();
      warnBanner.textContent = `⚠ ${name} INCOMING — ${secs}s`;
      const pulse = Math.floor(performance.now() / 200) % 2;
      warnBanner.style.background = pulse ? 'rgba(255,40,40,0.95)' : 'rgba(180,20,20,0.85)';
      warnBanner.style.display = 'block';
    } else {
      warnBanner.style.display = 'none';
    }
    $('hp').textContent = Math.max(0, Math.floor(game.houseHp));
    $('phP').textContent = Math.max(0, Math.floor(game.player.hp));
    $('shelter').style.visibility = game.player.sheltered ? 'visible' : 'hidden';
    $('coins').textContent = game.economy.coins;
    $('wave').textContent = game.wave;
    $('state').textContent = game.state + (game.activeDisaster ? ` (${game.activeDisaster})` : '');
    const canStart = game.state === 'idle' || game.state === 'break';
    waveBtn.disabled = !canStart;
    waveBtn.style.opacity = canStart ? '1' : '0.4';
    waveBtn.style.display = (game.state === 'won' || game.state === 'lost') ? 'none' : 'block';

    if (!endShown && (game.state === 'won' || game.state === 'lost')) {
      endShown = true;
      endLayer.style.display = 'grid';
      const msg = game.state === 'won'
        ? 'You won!'
        : game.lostBy === 'player' ? 'Player defeated' : 'House destroyed';
      endLayer.querySelector('#endMsg').textContent = msg;
    }
  }
  return { refresh };
}
