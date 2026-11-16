import { io } from '/socket.io.esm.min.js';

const $ = (selector) => document.querySelector(selector);
const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const palette = [
  ['#544b5c', 'Charbon'], ['#b29acb', 'Lavande'], ['#df9f9e', 'Rose'],
  ['#e7bf73', 'Miel'], ['#9caf91', 'Sauge'], ['#8cacc2', 'Bleu'],
];
const signalingUrl = window.DUO_CONFIG?.signalingUrl || window.location.origin;
const socket = io(signalingUrl, { autoConnect: false });
let roomCode = new URLSearchParams(location.search).get('salon')?.toUpperCase();
if (!roomCode) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  roomCode = Array.from(crypto.getRandomValues(new Uint8Array(8)), (value) => alphabet[value % alphabet.length]).join('');
  const url = new URL(location.href);
  url.searchParams.set('salon', roomCode);
  history.replaceState(null, '', url);
}
$('#room-code').textContent = roomCode;
let myId;
let peerId;
let joined = false;
let departed = false;
let stream;
let peer;
let pendingCandidates = [];
let iceServers;
let toastTimer;
let cameraBusy = false;
let microphoneBusy = false;
let remoteCamera = false;
let polite = false;
let signalQueue = Promise.resolve();

function toast(message, error = false) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').className = `toast visible${error ? ' error' : ''}`;
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), error ? 7000 : 3500);
}

function status(text, error = false) {
  const badge = $('#connection-status');
  badge.replaceChildren(Object.assign(document.createElement('span')), document.createTextNode(text));
  badge.classList.toggle('error', error);
}

function confirmAction(title, text, action) {
  const dialog = $('#confirm-dialog');
  $('#confirm-title').textContent = title;
  $('#confirm-text').textContent = text;
  $('#confirm-ok').onclick = () => { dialog.close(); action(); };
  $('#confirm-cancel').onclick = () => dialog.close();
  dialog.showModal();
}

const boards = {};
for (const name of ['local', 'remote']) {
  const toolbar = $(`[data-toolbar="${name}"]`);
  toolbar.innerHTML = `
    <div class="tool-group" role="group" aria-label="Type de trait">
      <button class="tool-button selected" data-tool="pen" aria-label="Stylo" aria-pressed="true" title="Stylo">${icon('pen')}</button>
      <button class="tool-button" data-tool="eraser" aria-label="Gomme" aria-pressed="false" title="Gomme">${icon('eraser')}</button>
    </div><span class="toolbar-divider"></span>
    <div class="colors" role="group" aria-label="Couleur du trait">
      ${palette.map(([color, label], index) => `<button class="color-button${index === 0 ? ' selected' : ''}" style="--swatch:${color}" data-color="${color}" aria-label="${label}" aria-pressed="${index === 0}" title="${label}"></button>`).join('')}
      <label class="custom-color" title="Couleur personnalisée"><input type="color" value="#8061b3" aria-label="Couleur personnalisée"></label>
    </div><span class="toolbar-divider"></span>
    <label class="size-control" title="Épaisseur du trait"><span class="size-dot"></span><input type="range" min="1" max="32" value="4" aria-label="Épaisseur du trait"><output>4 px</output></label>
    <span class="toolbar-divider"></span><div class="history-tools">
      <button class="tool-button" data-undo aria-label="Annuler mon dernier trait" title="Annuler mon dernier trait">${icon('undo')}</button>
      <button class="tool-button" data-clear aria-label="Effacer cette toile" title="Effacer cette toile">${icon('trash')}</button>
    </div>`;
  const board = boards[name] = {
    name, canvas: $(`#${name}-canvas`), color: palette[0][0], size: 4, tool: 'pen',
    strokes: [], active: null, target: null, visible: true, lastSent: 0,
  };
  const chooseTool = (tool) => {
    board.tool = tool;
    toolbar.querySelectorAll('[data-tool]').forEach((button) => {
      const selected = button.dataset.tool === tool;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', selected);
    });
  };
  toolbar.querySelectorAll('[data-tool]').forEach((button) => {
    button.onclick = () => chooseTool(button.dataset.tool);
  });
  const chooseColor = (color, custom = false) => {
    board.color = color;
    chooseTool('pen');
    toolbar.querySelectorAll('[data-color]').forEach((button) => {
      const selected = !custom && button.dataset.color === color;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', selected);
    });
    toolbar.querySelector('.custom-color').classList.toggle('selected', custom);
  };
  toolbar.querySelectorAll('[data-color]').forEach((button) => {
    button.onclick = () => chooseColor(button.dataset.color);
  });
  toolbar.querySelector('[type="color"]').oninput = (event) => chooseColor(event.target.value, true);
  toolbar.querySelector('[type="range"]').oninput = (event) => {
    board.size = Number(event.target.value);
    toolbar.querySelector('output').value = `${board.size} px`;
  };
  toolbar.querySelector('[data-undo]').onclick = () => {
    finishStroke(board);
    if (joined && board.target) socket.emit('drawing:undo', board.target);
    else {
      board.strokes.pop();
      renderBoard(board);
    }
  };
  toolbar.querySelector('[data-clear]').onclick = () => {
    confirmAction('Une toile toute neuve ?', 'Les dessins de cette toile seront effacés pour vous deux. La vidéo reste en place.', () => {
      board.active = null;
      if (joined && board.target) socket.emit('drawing:clear', board.target);
      else { board.strokes = []; renderBoard(board); }
    });
  };
  board.canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || board.active) return;
    if (!board.visible) return;
    if (name === 'remote' && !peerId) return toast('Invitez votre complice pour dessiner son portrait.');
    if (!joined) return toast('Le salon est déconnecté. Attendez la reconnexion.', true);
    if (board.strokes.length >= 300) return toast('La toile est pleine. Effacez-la pour continuer.', true);
    board.canvas.setPointerCapture(event.pointerId);
    board.active = {
      id: crypto.randomUUID(), color: board.color, size: board.size, tool: board.tool,
      points: [pointAt(board, event)], author: myId, pointerId: event.pointerId,
    };
    board.strokes.push(board.active);
    renderBoard(board);
    sendStroke(board, true);
  });
  board.canvas.addEventListener('pointermove', (event) => {
    if (!board.active || event.pointerId !== board.active.pointerId) return;
    board.active.points.push(pointAt(board, event));
    renderBoard(board);
    sendStroke(board);
    if (board.active.points.length >= 3000) finishStroke(board);
  });
  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    board.canvas.addEventListener(eventName, () => finishStroke(board));
  }
  new ResizeObserver(() => renderBoard(board)).observe(board.canvas);
}

function pointAt(board, event) {
  const rect = board.canvas.getBoundingClientRect();
  return [
    Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
  ];
}

function paintStrokes(context, strokes, width, height) {
  for (const stroke of strokes) {
    context.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;
    context.lineWidth = stroke.size * width / 550;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    const [first, ...rest] = stroke.points;
    context.moveTo(first[0] * width, first[1] * height);
    if (rest.length === 0) {
      context.arc(first[0] * width, first[1] * height, context.lineWidth / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      rest.forEach(([x, y]) => context.lineTo(x * width, y * height));
      context.stroke();
    }
  }
  context.globalCompositeOperation = 'source-over';
}

function renderBoard(board) {
  const { canvas } = board;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * ratio);
  canvas.height = Math.round(canvas.clientHeight * ratio);
  paintStrokes(canvas.getContext('2d'), board.strokes, canvas.width, canvas.height);
}

function sendStroke(board, force = false) {
  if (!board.active || !joined || !board.target) return;
  if (!force && performance.now() - board.lastSent < 55) return;
  board.lastSent = performance.now();
  const { id, color, size, tool, points } = board.active;
  socket.emit('drawing:update', { target: board.target, stroke: { id, color, size, tool, points } });
}

function finishStroke(board) {
  if (!board.active) return;
  sendStroke(board, true);
  const pointerId = board.active.pointerId;
  board.active = null;
  if (board.canvas.hasPointerCapture(pointerId)) board.canvas.releasePointerCapture(pointerId);
}

document.querySelectorAll('[data-visibility]').forEach((button) => {
  button.onclick = () => {
    const board = boards[button.dataset.visibility];
    board.visible = !board.visible;
    board.canvas.classList.toggle('hidden-drawing', !board.visible);
    button.textContent = board.visible ? 'Dessin visible' : 'Dessin masqué';
    button.setAttribute('aria-pressed', !board.visible);
    button.setAttribute('aria-label', `${board.visible ? 'Masquer' : 'Afficher'} les dessins de cette toile`);
  };
});

async function copyInvite() {
  if (!joined) return toast('Le salon n’est pas connecté. L’invitation sera disponible à la reconnexion.', true);
  const url = new URL('/', location.origin);
  url.searchParams.set('salon', roomCode);
  try {
    await navigator.clipboard.writeText(`Viens dessiner avec moi sur duo. !\n${url.href}\nCode du salon : ${roomCode}`);
    toast('Invitation copiée ! Le lien et le code sont prêts à partager.');
  } catch {
    $('#copy-input').value = url.href;
    $('#copy-dialog').showModal();
    $('#copy-input').select();
  }
}
document.querySelectorAll('[data-invite]').forEach((button) => { button.onclick = copyInvite; });
$('#how-button').onclick = () => $('#how-dialog').showModal();
$('#join-button').onclick = () => $('#join-dialog').showModal();
document.querySelectorAll('.dialog-close').forEach((button) => { button.onclick = () => button.closest('dialog').close(); });
document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
});
$('#join-form').onsubmit = (event) => {
  event.preventDefault();
  const input = $('#invite-input').value.trim();
  let code = input.toUpperCase();
  const link = input.match(/https?:\/\/\S+/i)?.[0];
  if (link) {
    try { code = new URL(link).searchParams.get('salon')?.toUpperCase() ?? ''; }
    catch { code = ''; }
  }
  if (!/^[A-Z0-9]{8}$/.test(code)) {
    $('#join-error').textContent = 'Saisissez un lien duo. valide ou un code de 8 lettres et chiffres.';
    return;
  }
  const url = new URL(location.href);
  url.searchParams.set('salon', code);
  location.assign(url.href);
};

function mediaState() {
  return {
    camera: stream?.getVideoTracks().some((track) => track.enabled && track.readyState === 'live') ?? false,
    microphone: stream?.getAudioTracks().some((track) => track.enabled && track.readyState === 'live') ?? false,
  };
}

function updateMedia() {
  const state = mediaState();
  $('#local-video').classList.toggle('active', state.camera);
  $('#local-placeholder').hidden = state.camera;
  $('#local-media-label').textContent = state.camera ? 'En direct' : 'Caméra éteinte';
  $('#start-camera').innerHTML = `${icon('camera')}Activer ma caméra`;
  for (const [name, enabled] of [['camera', state.camera], ['mic', state.microphone]]) {
    const button = $(`#toggle-${name}`);
    const label = `${enabled ? 'Désactiver' : 'Activer'} ${name === 'camera' ? 'la caméra' : 'le micro'}`;
    button.setAttribute('aria-pressed', enabled);
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  if (joined) socket.emit('media', state);
}

function mediaError(error) {
  const messages = {
    NotAllowedError: 'Accès refusé. Autorisez la caméra ou le micro dans les réglages de votre navigateur.',
    NotFoundError: 'Aucune caméra ou aucun micro détecté. Vous pouvez toujours dessiner.',
    NotReadableError: 'Ce périphérique est occupé par une autre application.',
    OverconstrainedError: 'Ce périphérique ne prend pas en charge les réglages demandés.',
  };
  toast(messages[error.name] ?? `Impossible d’activer ce périphérique : ${error.message}`, true);
}

async function enableTrack(kind) {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast('La caméra et le micro nécessitent HTTPS (ou localhost) et un navigateur compatible.', true);
    return;
  }
  if (departed) return toast('Rechargez la page pour revenir dans l’atelier.', true);
  let acquired;
  try {
    acquired = await navigator.mediaDevices.getUserMedia(kind === 'video' ? { video: { width: 1280, height: 720 }, audio: false } : { audio: true, video: false });
    if (departed) { acquired.getTracks().forEach((track) => track.stop()); return; }
    stream ??= new MediaStream();
    for (const track of acquired.getTracks()) {
      stream.addTrack(track);
      track.onended = () => { updateMedia(); toast('Un périphérique a été déconnecté.', true); };
      if (peer) {
        const transceiver = peer.getTransceivers().find((entry) => entry.receiver.track.kind === track.kind);
        if (transceiver) await transceiver.sender.replaceTrack(track);
      }
    }
    $('#local-video').srcObject = stream;
    updateMedia();
  } catch (error) {
    acquired?.getTracks().forEach((track) => { track.stop(); stream?.removeTrack(track); });
    updateMedia();
    mediaError(error);
  }
}

async function toggleCamera() {
  if (cameraBusy) return;
  cameraBusy = true;
  $('#start-camera').disabled = true;
  $('#toggle-camera').disabled = true;
  $('#toggle-camera').setAttribute('aria-busy', 'true');
  try {
    const track = stream?.getVideoTracks().find((entry) => entry.readyState === 'live');
    if (!track) await enableTrack('video');
    else { track.enabled = !track.enabled; updateMedia(); }
  } finally {
    cameraBusy = false;
    $('#start-camera').disabled = false;
    $('#toggle-camera').disabled = false;
    $('#toggle-camera').setAttribute('aria-busy', 'false');
  }
}
async function toggleMicrophone() {
  if (microphoneBusy) return;
  microphoneBusy = true;
  $('#toggle-mic').disabled = true;
  $('#toggle-mic').setAttribute('aria-busy', 'true');
  try {
    const track = stream?.getAudioTracks().find((entry) => entry.readyState === 'live');
    if (!track) await enableTrack('audio');
    else { track.enabled = !track.enabled; updateMedia(); }
  } finally {
    microphoneBusy = false;
    $('#toggle-mic').disabled = false;
    $('#toggle-mic').setAttribute('aria-busy', 'false');
  }
}
$('#start-camera').onclick = toggleCamera;
$('#toggle-camera').onclick = toggleCamera;
$('#toggle-mic').onclick = toggleMicrophone;

function resetPeer() {
  if (peer) {
    peer.onconnectionstatechange = null;
    peer.onnegotiationneeded = null;
    peer.onicecandidate = null;
    peer.close();
  }
  peer = null;
  pendingCandidates = [];
  remoteCamera = false;
  $('#remote-video').srcObject = null;
  $('#enable-sound').hidden = true;
  updateRemote();
}

function updateRemote() {
  const video = $('#remote-video');
  const hasVideo = remoteCamera && video.srcObject?.getVideoTracks().some((track) => track.readyState === 'live');
  video.classList.toggle('active', Boolean(hasVideo));
  $('#remote-placeholder').hidden = Boolean(hasVideo);
  $('#remote-tag').textContent = peerId ? 'Votre partenaire de gribouillis' : 'La place est libre';
  $('#remote-media-label').textContent = peerId ? (remoteCamera ? 'En direct' : 'Caméra éteinte') : 'En attente';
  $('#remote-placeholder-title').textContent = peerId ? 'Votre complice est là !' : 'À deux, c’est encore mieux.';
  $('#remote-placeholder-text').textContent = peerId ? 'Sa caméra est éteinte. Les crayons, eux, sont prêts.' : 'Invitez votre complice et laissez parler vos coups de crayon.';
  $('#remote-placeholder [data-invite]').hidden = Boolean(peerId);
  $('#remote-placeholder .no-account').hidden = Boolean(peerId);
  if (joined) status(peerId ? 'À deux dans l’atelier' : 'En attendant votre complice');
}

function createPeer() {
  if (peer || !peerId || !iceServers) return;
  const connection = peer = new RTCPeerConnection({ iceServers });
  connection.onicecandidate = ({ candidate }) => {
    if (candidate) socket.emit('signal', { to: peerId, data: { candidate } });
  };
  connection.ontrack = ({ track }) => {
    const video = $('#remote-video');
    track.onunmute = () => {
      if (connection !== peer) return;
      const received = video.srcObject ?? new MediaStream();
      if (!received.getTracks().some((entry) => entry.id === track.id)) received.addTrack(track);
      video.srcObject = received;
      track.onended = updateRemote;
      updateRemote();
      video.play().catch((error) => {
        if (error.name === 'NotAllowedError') {
          $('#enable-sound').hidden = false;
          toast('Cliquez sur « Activer le son » pour entendre votre complice.');
        } else if (error.name !== 'AbortError') {
          toast(`Lecture vidéo impossible : ${error.message}`, true);
        }
      });
    };
  };
  connection.onnegotiationneeded = async () => {
    if (polite || connection.signalingState !== 'stable') return;
    try {
      await attachTracks(connection);
      await connection.setLocalDescription();
      socket.emit('signal', { to: peerId, data: { description: connection.localDescription } });
    } catch (error) {
      if (connection === peer) toast(`Connexion vidéo impossible : ${error.message}`, true);
    }
  };
  connection.onconnectionstatechange = () => {
    if (connection.connectionState === 'failed') {
      status('Vidéo non connectée', true);
      toast('La connexion vidéo a échoué. Vérifiez le réseau ou la configuration TURN du serveur.', true);
    } else if (connection.connectionState === 'disconnected') {
      status('Vidéo interrompue', true);
    } else if (connection.connectionState === 'connected') updateRemote();
  };
  // Only the first participant offers; reserved senders avoid renegotiation when a camera starts.
  if (!polite) {
    connection.addTransceiver('video', { direction: 'sendrecv' });
    connection.addTransceiver('audio', { direction: 'sendrecv' });
  }
}

async function attachTracks(connection) {
  for (const transceiver of connection.getTransceivers()) {
    transceiver.direction = 'sendrecv';
    const track = stream?.getTracks().find((entry) => entry.kind === transceiver.receiver.track.kind && entry.readyState === 'live');
    if (track) await transceiver.sender.replaceTrack(track);
  }
}

$('#enable-sound').onclick = async () => {
  try {
    await $('#remote-video').play();
    $('#enable-sound').hidden = true;
  } catch (error) { toast(`Lecture impossible : ${error.message}`, true); }
};

socket.on('signal', ({ from, data }) => {
  if (from !== peerId) return;
  const expectedPeer = peerId;
  signalQueue = signalQueue.then(async () => {
    if (expectedPeer !== peerId) return;
    createPeer();
    if (!peer) return;
    const connection = peer;
    if (data.description) {
      await connection.setRemoteDescription(data.description);
      for (const candidate of pendingCandidates) await connection.addIceCandidate(candidate);
      pendingCandidates = [];
      if (data.description.type === 'offer') {
        await attachTracks(connection);
        await connection.setLocalDescription();
        socket.emit('signal', { to: peerId, data: { description: connection.localDescription } });
      }
    } else if (data.candidate) {
      if (connection.remoteDescription) await connection.addIceCandidate(data.candidate);
      else pendingCandidates.push(data.candidate);
    }
  }).catch((error) => toast(`Erreur de connexion vidéo : ${error.message}`, true));
});

socket.on('connect', () => {
  socket.timeout(10_000).emit('join', roomCode, (error, result) => {
    if (error || result.error) {
      status('Salon indisponible', true);
      toast(result?.error ?? 'Le serveur ne répond pas. Réessayez en rechargeant la page.', true);
      return;
    }
    joined = true;
    myId = result.id;
    peerId = result.peers[0];
    polite = true;
    boards.local.target = myId;
    boards.remote.target = peerId;
    // Keep local artwork across a signaling reconnect, when the participant ID changes.
    const localStrokes = boards.local.strokes;
    boards.local.strokes = result.drawings[myId] ?? [];
    for (const stroke of localStrokes) {
      stroke.author = myId;
      boards.local.strokes.push(stroke);
      socket.emit('drawing:update', { target: myId, stroke });
    }
    boards.remote.strokes = result.drawings[peerId] ?? [];
    renderBoard(boards.local);
    renderBoard(boards.remote);
    updateMedia();
    updateRemote();
    if (peerId) createPeer();
  });
});
socket.on('peer:joined', (id) => {
  peerId = id;
  polite = false;
  boards.remote.target = id;
  boards.remote.strokes = [];
  updateRemote();
  updateMedia();
  createPeer();
  toast('Votre complice est arrivé. À vos crayons !');
});
socket.on('peer:left', () => {
  peerId = null;
  boards.remote.active = null;
  boards.remote.target = null;
  boards.remote.strokes = [];
  resetPeer();
  renderBoard(boards.remote);
  toast('Votre complice a quitté l’atelier.');
});
socket.on('media', (state) => {
  remoteCamera = state.camera;
  updateRemote();
});
socket.on('drawing:update', ({ target, stroke }) => {
  const board = Object.values(boards).find((entry) => entry.target === target);
  if (!board) return;
  const index = board.strokes.findIndex((entry) => entry.id === stroke.id);
  if (index >= 0) board.strokes[index] = stroke;
  else board.strokes.push(stroke);
  renderBoard(board);
});
socket.on('drawing:state', ({ target, strokes }) => {
  const board = Object.values(boards).find((entry) => entry.target === target);
  if (!board) return;
  board.active = null;
  board.strokes = strokes;
  renderBoard(board);
});
socket.on('notice', (message) => toast(message, true));
socket.on('disconnect', () => {
  joined = false;
  peerId = null;
  for (const board of Object.values(boards)) board.active = null;
  resetPeer();
  status(departed ? 'Salon quitté' : 'Reconnexion…', true);
});
socket.on('connect_error', () => {
  status('Serveur inaccessible', true);
  toast('Connexion au serveur impossible. Vérifiez le réseau et l’adresse du serveur temps réel.', true);
});

$('#hangup').onclick = () => confirmAction('On range les crayons ?', 'Vous allez quitter le salon et couper votre caméra et votre micro. Capturez le duo avant de partir pour garder vos dessins.', () => {
  departed = true;
  joined = false;
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  $('#local-video').srcObject = null;
  updateMedia();
  socket.disconnect();
  resetPeer();
  status('Salon quitté', true);
  toast('Vous avez quitté le salon. Rechargez la page pour revenir.');
});

function drawContained(context, video, x, y, width, height) {
  const scale = Math.min(width / video.videoWidth, height / video.videoHeight);
  const w = video.videoWidth * scale;
  const h = video.videoHeight * scale;
  context.drawImage(video, x + (width - w) / 2, y + (height - h) / 2, w, h);
}

$('#capture').onclick = async () => {
  const result = document.createElement('canvas');
  result.width = 1640;
  result.height = 800;
  const context = result.getContext('2d');
  context.fillStyle = '#f8f7f3';
  context.fillRect(0, 0, result.width, result.height);
  context.fillStyle = '#8061b3';
  context.font = 'bold 36px sans-serif';
  context.fillText('duo. — Un trait nous rapproche.', 40, 65);
  for (const [index, board] of Object.values(boards).entries()) {
    const x = 40 + index * 800;
    const height = 760 * board.canvas.clientHeight / board.canvas.clientWidth;
    const outputHeight = Math.min(580, height);
    const width = outputHeight * board.canvas.clientWidth / board.canvas.clientHeight;
    const video = $(`#${board.name}-video`);
    context.fillStyle = board.name === 'local' ? '#f0dfcd' : '#f1eef7';
    context.fillRect(x, 100, width, outputHeight);
    if (video.classList.contains('active') && video.readyState >= 2 && video.videoWidth) {
      drawContained(context, video, x, 100, width, outputHeight);
    }
    const layer = document.createElement('canvas');
    layer.width = Math.round(width);
    layer.height = Math.round(outputHeight);
    if (board.visible) paintStrokes(layer.getContext('2d'), board.strokes, layer.width, layer.height);
    context.drawImage(layer, x, 100, width, outputHeight);
    context.font = '20px sans-serif';
    context.fillStyle = '#8061b3';
    context.fillText(board.name === 'local' ? 'Vous' : 'Votre complice', x, 720);
  }
  context.font = '16px sans-serif';
  context.fillStyle = '#9b8ba7';
  context.fillText(new Date().toLocaleDateString('fr-FR'), 40, 765);
  const blob = await new Promise((resolve) => result.toBlob(resolve, 'image/png'));
  if (!blob) return toast('La capture n’a pas pu être créée. Réessayez.', true);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `duo-${new Date().toISOString().slice(0, 10)}.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  toast('Votre duo est capturé. Un petit souvenir à garder !');
};

window.addEventListener('beforeunload', () => stream?.getTracks().forEach((track) => track.stop()));

async function start() {
  if (!/^[A-Z0-9]{8}$/.test(roomCode)) {
    status('Code invalide', true);
    $('#join-dialog').showModal();
    $('#join-error').textContent = 'Ce lien ne contient pas un code de salon valide.';
    return;
  }
  try {
    const response = await fetch(`${signalingUrl}/api/config`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config = await response.json();
    if (!Array.isArray(config.iceServers)) throw new Error('Configuration vidéo invalide');
    iceServers = config.iceServers;
    socket.connect();
  } catch (error) {
    status('Serveur inaccessible', true);
    toast(`Le serveur temps réel est indisponible (${error.message}). Vérifiez la configuration puis rechargez.`, true);
  }
}
start();
