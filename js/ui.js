import { startMusic, toggleMute, isMuted, setTrack, sfxWarning, sfxHurt } from './audio.js';
import { t, setLang, getLang } from './i18n.js';

export function createUi(game) {
  const root = document.getElementById('hud');
  root.style.cssText = `
    position: fixed; top: 8px; left: 8px; padding: 8px 12px;
    background: rgba(0,0,0,0.55); color: #fff; font-family: sans-serif; border-radius: 6px;
  `;

  function renderHud() {
    root.innerHTML = `
      <div><span id="lblTitle"></span></div>
      <div><span id="lblHouseHp"></span>: <span id="hp"></span></div>
      <div><span id="lblPlayerHp"></span>: <span id="phP"></span> <span id="shelter" style="color:#7df"></span></div>
      <div><span id="lblCoins"></span>: <span id="coins"></span></div>
      <div><span id="lblWave"></span>: <span id="wave"></span> / 10</div>
      <div><span id="lblState"></span>: <span id="state"></span></div>
      <div id="nextWave" style="color:#7df;font-size:12px;display:none"></div>
      <div style="font-size:12px;opacity:.85">🏆 <span id="achCount">0</span> / 7</div>
      <div style="margin-top:6px;font-size:12px;opacity:.8" id="lblTip"></div>
    `;
    $('lblTitle').textContent     = t('title');
    $('lblHouseHp').textContent   = t('houseHp');
    $('lblPlayerHp').textContent  = t('playerHp');
    $('lblCoins').textContent     = t('coins');
    $('lblWave').textContent      = t('wave');
    $('lblState').textContent     = t('state');
    $('lblTip').textContent       = t('tipBottom');
    $('shelter').textContent      = t('shelter');
  }
  const $ = id => document.getElementById(id);
  renderHud();

  let endShown = false;
  const endLayer = document.createElement('div');
  endLayer.style.cssText = `
    position: fixed; inset: 0; display: none; place-items: center;
    background: rgba(0,0,0,0.7); color: #fff; font-family: sans-serif;
    font-size: 36px; text-align: center;
  `;
  endLayer.innerHTML = `<div><div id="endMsg"></div>
    <div style="margin-top:12px"><button id="restartBtn" style="font-size:18px"></button></div></div>`;
  document.body.appendChild(endLayer);
  const restartBtn = endLayer.querySelector('#restartBtn');
  restartBtn.addEventListener('click', () => location.reload());
  function paintRestart() { restartBtn.textContent = t('playAgain'); }
  paintRestart();

  const introLayer = document.createElement('div');
  introLayer.style.cssText = `
    position: fixed; inset: 0;
    display: flex; align-items: flex-start; justify-content: center;
    background: rgba(0,0,0,0.88); color: #fff; font-family: sans-serif;
    z-index: 100; overflow-y: auto; padding: 20px 0;
    -webkit-overflow-scrolling: touch;
  `;

  function renderIntro() {
    introLayer.innerHTML = `
      <div style="max-width: 540px; padding: 18px; line-height: 1.4; font-size: 14px">
        <h1 style="margin: 0 0 4px; color: #ffd54f">${t('title')}</h1>
        <div style="opacity:.85;margin-bottom:10px">${t('goalLine')}</div>

        <div style="margin:8px 0;padding:8px 0;border-top:1px solid #333;border-bottom:1px solid #333">
          <div style="margin-bottom:6px;color:#7df">${t('language')}</div>
          <div id="langRow" style="display:flex;gap:8px"></div>
        </div>
        <div style="margin:8px 0;padding-bottom:8px;border-bottom:1px solid #333">
          <div style="margin-bottom:6px;color:#7df">${t('difficulty')}</div>
          <div id="diffRow" style="display:flex;gap:8px"></div>
        </div>

        <div style="color:#7df;margin:8px 0 2px">${t('secMove')}</div>
        <div>${t('moveText')}</div>

        <div style="color:#7df;margin:8px 0 2px">${t('secTowers')}</div>
        <div>${t('towersText')}</div>

        <div style="color:#7df;margin:8px 0 2px">${t('secWeapons')}</div>
        <div>${t('weaponsText')}</div>

        <div style="color:#7df;margin:8px 0 2px">${t('secEnemies')}</div>
        <div>${t('enemiesText')}</div>

        <div style="color:#7df;margin:8px 0 2px">${t('secDisasters')}</div>
        <div>${t('disastersText')}</div>

        <div style="color:#7df;margin:8px 0 2px">${t('secSound')}</div>
        <div>${t('soundText')}</div>

        <div style="color:#7df;margin:8px 0 2px">${t('secTips')}</div>
        <div>${t('tipsText')}</div>

        <div style="margin-top:14px;text-align:center">
          <button id="introStartBtn" style="font-size:18px;padding:10px 26px;cursor:pointer;border-radius:8px;border:none;background:#ffd54f;color:#111;font-weight:700">${t('startPlaying')}</button>
        </div>
      </div>
    `;
    wireIntroButtons();
  }

  function wireIntroButtons() {
    const langRow = introLayer.querySelector('#langRow');
    const langs = [['en', 'English'], ['zh', '中文']];
    function paintLang() {
      for (const child of langRow.children) {
        const sel = child.dataset.code === getLang();
        child.style.background = sel ? '#ffd54f' : '#444';
        child.style.color = sel ? '#111' : '#fff';
        child.style.fontWeight = sel ? '700' : '500';
      }
    }
    for (const [code, label] of langs) {
      const b = document.createElement('button');
      b.textContent = label;
      b.dataset.code = code;
      b.style.cssText = `
        flex:1; padding:8px 0; font-size:14px; border:1px solid #666; border-radius:6px;
        background:#444; color:#fff; cursor:pointer; touch-action:manipulation;
      `;
      b.addEventListener('click', () => { setLang(code); applyLanguage(); });
      langRow.appendChild(b);
    }
    paintLang();

    const diffRow = introLayer.querySelector('#diffRow');
    function paintDiff() {
      for (const child of diffRow.children) {
        const sel = child.dataset.code === game.difficulty;
        child.style.background = sel ? '#ffd54f' : '#444';
        child.style.color = sel ? '#111' : '#fff';
        child.style.fontWeight = sel ? '700' : '500';
      }
    }
    for (const k of ['easy', 'normal', 'hard']) {
      const b = document.createElement('button');
      b.textContent = t(k);
      b.dataset.code = k;
      b.style.cssText = `
        flex:1; padding:8px 0; font-size:14px; border:1px solid #666; border-radius:6px;
        background:#444; color:#fff; cursor:pointer; touch-action:manipulation;
      `;
      b.addEventListener('click', () => { game.setDifficulty(k); paintDiff(); });
      diffRow.appendChild(b);
    }
    paintDiff();

    introLayer.querySelector('#introStartBtn').addEventListener('click', () => {
      introLayer.style.display = 'none';
      startMusic();
    });
  }
  renderIntro();
  document.body.appendChild(introLayer);

  const actions = document.createElement('div');
  actions.style.cssText = `
    position: fixed; right: 14px; bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    display: grid; grid-template-columns: repeat(3, 60px); gap: 8px;
    z-index: 30; user-select: none; touch-action: manipulation;
  `;
  document.body.appendChild(actions);

  const actBtnDefs = [
    ['1', 'cannon', '#777', () => game.placeTowerAtPlayer('cannon')],
    ['2', 'turret', '#36c', () => game.placeTowerAtPlayer('turret')],
    ['3', 'trap',   '#c63', () => game.placeTowerAtPlayer('trap')],
    ['4', 'gun',    '#aaa', () => game.buyGun()],
    ['5', 'bomb',   '#222', () => game.throwBomb()],
    ['␣', 'jump',   '#3a3', () => game.playerJump()],
  ];
  function renderActions() {
    actions.innerHTML = '';
    for (const [key, labelKey, bg, onPress] of actBtnDefs) {
      const b = document.createElement('button');
      b.innerHTML = `<span style="font-size:10px;opacity:.75;display:block;line-height:1">${key}</span><span style="font-size:11px;font-weight:700;line-height:1.1">${t(labelKey)}</span>`;
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
      actions.appendChild(b);
    }
  }
  renderActions();

  const waveBtn = document.createElement('button');
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
  function paintWaveBtn() { waveBtn.textContent = t('startWave'); }
  paintWaveBtn();

  function tinyBtn(top, right, label, onTap) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = `
      position: fixed; top: ${top}px; right: ${right}px;
      width: 44px; height: 44px; font-size: 16px; font-weight: 700;
      background: rgba(0,0,0,0.55); color: #fff; border: none; border-radius: 50%;
      z-index: 30; cursor: pointer; touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    `;
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); onTap(b); });
    document.body.appendChild(b);
    return b;
  }
  const muteBtn = tinyBtn(12, 12, '🔊', (b) => { toggleMute(); b.textContent = isMuted() ? '🔇' : '🔊'; });
  const pauseBtn = tinyBtn(12, 64, '⏸', (b) => { game.togglePause(); b.textContent = game.paused ? '▶' : '⏸'; });
  const speedBtn = tinyBtn(12, 116, '1x', (b) => { game.cycleSpeed(); b.textContent = game.speed + 'x'; });

  const hurtOverlay = document.createElement('div');
  hurtOverlay.style.cssText = `
    position: fixed; inset: 0; pointer-events: none;
    box-shadow: inset 0 0 90px 30px rgba(255,30,30,0.65);
    opacity: 0; transition: opacity .25s ease-out;
    z-index: 25;
  `;
  document.body.appendChild(hurtOverlay);

  const warnBanner = document.createElement('div');
  warnBanner.style.cssText = `
    position: fixed; top: 64px; left: 50%; transform: translateX(-50%);
    padding: 10px 20px; font-family: sans-serif; font-weight: 700; font-size: 20px;
    background: rgba(220,30,30,0.85); color: #fff; border: 2px solid #fff;
    border-radius: 10px; z-index: 35; text-align: center; display: none;
    box-shadow: 0 0 20px rgba(255,0,0,.6); pointer-events: none;
  `;
  document.body.appendChild(warnBanner);

  function applyLanguage() {
    renderHud();
    renderIntro();
    renderActions();
    paintWaveBtn();
    paintRestart();
  }

  function trackForGame() {
    if (game.state === 'won') return 'victory';
    if (game.state === 'lost') return 'defeat';
    if (game.state === 'wave') {
      if (game.activeEnemies.some(e => e.type === 'mothership')) return 'boss';
      return 'battle';
    }
    return 'calm';
  }

  const stateKeyOf = { idle: 'stateIdle', break: 'stateBreak', wave: 'stateWave', won: 'stateWon', lost: 'stateLost' };

  let lastPending = null;
  let lastPlayerHp = game.player.hp;
  let hurtTimer = 0;
  function refresh() {
    setTrack(trackForGame());
    if (game.pendingDisaster && game.pendingDisaster !== lastPending) {
      sfxWarning();
    }
    lastPending = game.pendingDisaster;

    if (game.player.hp < lastPlayerHp && game.state !== 'lost') {
      hurtTimer = 1.0;
      sfxHurt();
    }
    lastPlayerHp = game.player.hp;
    if (hurtTimer > 0) {
      hurtOverlay.style.opacity = String(Math.min(1, hurtTimer));
      hurtTimer -= 0.06;
    } else {
      hurtOverlay.style.opacity = '0';
    }
    if (game.pendingDisaster) {
      const secs = Math.max(0, game.pendingDisasterTimer / 1000).toFixed(1);
      warnBanner.textContent = `⚠ ${t(game.pendingDisaster)} ${t('incoming')} — ${secs}${t('secondsAbbrev')}`;
      const pulse = Math.floor(performance.now() / 200) % 2;
      warnBanner.style.background = pulse ? 'rgba(255,40,40,0.95)' : 'rgba(180,20,20,0.85)';
      warnBanner.style.display = 'block';
    } else {
      warnBanner.style.display = 'none';
    }
    $('hp').textContent = Math.max(0, Math.floor(game.houseHp));
    const php = Math.max(0, Math.floor(game.player.hp));
    $('phP').textContent = php;
    const low = game.player.hp > 0 && game.player.hp < 21;
    if (low) {
      const pulse = (Math.sin(performance.now() / 150) + 1) * 0.5;
      $('phP').style.color = `rgb(255, ${Math.floor(80 + pulse * 80)}, ${Math.floor(80 + pulse * 40)})`;
      $('phP').style.fontWeight = '700';
    } else {
      $('phP').style.color = '#fff';
      $('phP').style.fontWeight = '400';
    }
    $('shelter').style.visibility = game.player.sheltered ? 'visible' : 'hidden';
    const ach = document.getElementById('achCount');
    if (ach) ach.textContent = game.achievements.size;
    const nw = document.getElementById('nextWave');
    if (nw) {
      if (game.state === 'break' && game.nextWaveInfo) {
        const w = game.nextWaveInfo;
        const parts = [];
        if (w.zombies) parts.push(`${w.zombies}z`);
        if (w.aliens)  parts.push(`${w.aliens}a`);
        if (w.bombers) parts.push(`${w.bombers}b`);
        if (w.archers) parts.push(`${w.archers}arc`);
        if (w.mothership) parts.push(`${w.mothership}🛸`);
        nw.textContent = `Next: ${parts.join(' ')}`;
        nw.style.display = 'block';
      } else {
        nw.style.display = 'none';
      }
    }
    $('coins').textContent = game.economy.coins;
    $('wave').textContent = game.wave;
    const stateLabel = t(stateKeyOf[game.state] || 'stateIdle');
    $('state').textContent = stateLabel + (game.activeDisaster ? ` (${t(game.activeDisaster)})` : '');
    const canStart = game.state === 'idle' || game.state === 'break';
    waveBtn.disabled = !canStart;
    waveBtn.style.opacity = canStart ? '1' : '0.4';
    waveBtn.style.display = (game.state === 'won' || game.state === 'lost') ? 'none' : 'block';

    if (!endShown && (game.state === 'won' || game.state === 'lost')) {
      endShown = true;
      endLayer.style.display = 'grid';
      const msgKey = game.state === 'won' ? 'won' : (game.lostBy === 'player' ? 'lostPlayer' : 'lostHouse');
      endLayer.querySelector('#endMsg').textContent = t(msgKey);
    }
  }
  return { refresh };
}
