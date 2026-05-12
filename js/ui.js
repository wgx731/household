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
    <div>HP: <span id="hp"></span></div>
    <div>Coins: <span id="coins"></span></div>
    <div>Wave: <span id="wave"></span> / 10</div>
    <div>State: <span id="state"></span></div>
    <div>Tower: <span id="sel"></span></div>
    <div style="margin-top:6px"><button id="startBtn">Start Wave</button></div>
    <div style="margin-top:6px;font-size:12px;opacity:.8">Keys: 1 cannon | 2 turret | 3 trap. Click to place.</div>
  `;
  const $ = id => document.getElementById(id);
  $('startBtn').addEventListener('click', () => game.startNextWave());

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

  function refresh(selected) {
    $('hp').textContent = Math.max(0, Math.floor(game.houseHp));
    $('coins').textContent = game.economy.coins;
    $('wave').textContent = game.wave;
    $('state').textContent = game.state + (game.activeDisaster ? ` (${game.activeDisaster})` : '');
    $('sel').textContent = selected;
    $('startBtn').disabled = !(game.state === 'idle' || game.state === 'break');

    if (!endShown && (game.state === 'won' || game.state === 'lost')) {
      endShown = true;
      endLayer.style.display = 'grid';
      endLayer.querySelector('#endMsg').textContent = game.state === 'won' ? 'You won!' : 'House destroyed';
    }
  }
  return { refresh };
}
