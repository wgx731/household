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
    <div style="max-width: 520px; padding: 18px; line-height: 1.4; font-size: 14px">
      <h1 style="margin: 0 0 4px; color: #ffd54f">HouseHold</h1>
      <div style="opacity:.85;margin-bottom:10px">Defend the house through 10 waves. Beat the alien mothership to win.</div>

      <div style="margin:10px 0;padding:8px 0;border-top:1px solid #333;border-bottom:1px solid #333">
        <div style="margin-bottom:6px;color:#7df">Difficulty</div>
        <div id="diffRow" style="display:flex;gap:8px"></div>
      </div>

      <div style="color:#7df;margin:8px 0 2px">Move &amp; place</div>
      <div>WASD / arrows or tap map to walk. Space jumps and dodges hits. 1-3 drop cannon / turret / trap; 4 buys gun (50c, auto-fires, lasts 3 waves); 5 throws bomb (25c). Walk into the house for shelter.</div>

      <div style="color:#7df;margin:8px 0 2px">Towers</div>
      <div><b style="color:#aaa">Cannon</b> 20c, hits ground &middot; <b style="color:#6af">Turret</b> 25c, hits air &middot; <b style="color:#f73">Trap</b> 10c on path, one big hit</div>

      <div style="color:#7df;margin:8px 0 2px">Enemies</div>
      <div><b>Zombie</b> ground &rarr; cannon/trap. <b>Alien</b> air &rarr; turret. <b>Mothership</b> boss air &rarr; turret. <b>Bomber</b> explodes near anything. <b>Archer</b> shoots you from afar.</div>

      <div style="color:#7df;margin:8px 0 2px">Disasters (3s warning)</div>
      <div><b>Earthquake</b> shakes screen, breaks 2 towers. <b>Flood</b> -10 HP then drains outside; hide in house. <b>Volcano</b> pours lava on a path (-30 HP), traps on it die; jump over.</div>

      <div style="color:#7df;margin:8px 0 2px">Sound</div>
      <div>Music shifts with the action. Each weapon and disaster has its own SFX. 🔊 top-right mutes.</div>

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
