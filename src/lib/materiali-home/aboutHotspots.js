import * as THREE from 'three';

/**
 * @typedef {{
 *   id: string;
 *   azimuth: number;
 *   elevation: number;
 *   label: string;
 *   title?: string;
 *   body: string;
 *   sources: string;
 *   modelSrc: string;
 *   template?: 'sport' | 'card';
 * }} AboutHotspot
 */

/** Distanza minima tra marker consecutivi sul percorso (unità mondo). */
export const MIN_HOTSPOT_SPACING = 7;

/** Posizioni desktop: distribuite attorno al perimetro della montagna. */
const DESKTOP_HOTSPOT_PLACEMENTS = [
  { azimuth: 0.06, elevation: 0.18 },
  { azimuth: 0.3, elevation: 0.34 },
  { azimuth: 0.54, elevation: 0.48 },
  { azimuth: 0.78, elevation: 0.56 }
];

/** Posizioni mobile: stesso giro attorno alla montagna, quote più alte. */
const MOBILE_HOTSPOT_PLACEMENTS = [
  { azimuth: 0.08, elevation: 0.26 },
  { azimuth: 0.32, elevation: 0.38 },
  { azimuth: 0.56, elevation: 0.48 },
  { azimuth: 0.78, elevation: 0.56 }
];
/** Breakpoint allineato al layout about mobile (pannello in basso). */
export const ABOUT_MOBILE_BREAKPOINT = 768;

/** Breakpoint layout pannello testo mobile (AboutSportDetail). */
export const ABOUT_PANEL_MOBILE_BREAKPOINT = 900;

export function isAboutMobileLayout() {
  return typeof window !== 'undefined' && window.innerWidth < ABOUT_MOBILE_BREAKPOINT;
}

export function isAboutPanelMobileLayout() {
  return typeof window !== 'undefined' && window.innerWidth <= ABOUT_PANEL_MOBILE_BREAKPOINT;
}

/**
 * Posiziona gli hotspot attorno alla montagna, distanziati sul percorso
 * in senso orario così restano raggiungibili ruotando la scena.
 *
 * @param {AboutHotspot} hotspot
 * @param {boolean} [mobile]
 */
export function getHotspotPlacement(hotspot, mobile = isAboutMobileLayout()) {
  const index = getHotspotPathIndex(hotspot.id);
  if (index < 0) {
    return { azimuth: hotspot.azimuth, elevation: hotspot.elevation };
  }

  const table = mobile ? MOBILE_HOTSPOT_PLACEMENTS : DESKTOP_HOTSPOT_PLACEMENTS;
  return table[index] ?? { azimuth: hotspot.azimuth, elevation: hotspot.elevation };
}

/** @deprecated Usa getHotspotPlacement */
export function getMobileHotspotPlacement(hotspot) {
  return getHotspotPlacement(hotspot, true);
}

/** Quattro tappe sul percorso in senso orario (azimuth crescente = avanti nel percorso). */
/** @type {AboutHotspot[]} */
export const ABOUT_HOTSPOT_PATH = [
  {
    id: 'start',
    azimuth: 0.06,
    elevation: 0.18,
    label: 'Partenza',
    title: 'Il progetto',
    template: 'sport',
    body: `“Quante facce ha una medaglia?” è un progetto realizzato per il Laboratorio di Web e Digital Design, del Corso di Laurea in Design della Comunicazione del Politecnico di Milano. L’obiettivo è quello di creare un’esperienza digitale in grado di raccontare le Olimpiadi Invernali di Milano-Cortina 2026 come spazio narrativo: tra aspettative, pressioni, successi e fallimenti. Atleti, istituzioni e luoghi diventano protagonisti di storie che rendono l’evento sportivo un momento memorabile.

“Quante facce ha una medaglia?” nasce come provocazione di fronte al binomio buoni-cattivi, risultato di uno storytelling di intrattenimento che riduce le informazioni a dicotomie e schieramenti estremamente polarizzati. Lo scopo del sito è dimostrare che la formazione di questa polarità non è un processo oggettivo e naturale, ma dipende sempre dal contesto sociale, dalla costruzione mediatica e dal punto di vista di ogni singolo individuo: uno stesso evento può plasmare molteplici realtà, tutte contemporaneamente vere perché interpretazioni di fatti oggettivi.

L’intento non è quello di chiudere il dibattito sugli “eroi” e i “cattivi” delle Olimpiadi, ma di stimolare una riflessione riguardo al processo di creazione di protagonisti e antagonisti, idoli e capri espiatori, frutto dell’approccio estremizzante della comunicazione di massa.`,
    sources: 'fonte placeholder',
    modelSrc: '/oggetti/snowboardlady.glb'
  },
  {
    id: 'lower-slope',
    azimuth: 0.3,
    elevation: 0.34,
    label: 'Divergenza',
    title: 'Chi siamo – Divergenza',
    template: 'sport',
    body: `“Divergenza” è un gruppo di sei studenti del Politecnico di Milano, al secondo anno del Corso di Laurea in Design della Comunicazione.

Crediamo nella duplice essenza del Design: sia emotivo che funzionale. Per noi i progetti di comunicazione visiva, analogici o digitali che siano, hanno il compito di provocare nel fruitore una riflessione, sia interiore che rispetto al mondo che lo circonda.

Silvia La Mastra, implementazione e coding; Chiara Moretti, implementazione e coding; Letizia Neri, design system, prototipazione, copywriting; Giovanni Palladino, supporto a identità visiva; Siyu Yang, supporto a prototipazione; Jieni Ye, modellazione 3D.`,
    sources: 'fonte placeholder',
    modelSrc: '/oggetti/scii.glb'
  },
  {
    id: 'west-ridge',
    azimuth: 0.54,
    elevation: 0.48,
    label: 'Ricerca quantitativa',
    title: 'Ricerca quantitativa',
    template: 'sport',
    body: `Come primo passaggio di ricerca sociale abbiamo condotto un sondaggio anonimo online, raccogliendo le opinioni di più di 130 soggetti campione, in modo da avere una visione d’insieme su come il pubblico generale ha visto e interpretato gli eventi dei Giochi.

La maggioranza delle risposte che abbiamo ricevuto provenivano da giovani adulti (18-25 anni) residenti a Milano o in zone di hinterland, questa categoria demografica identifica i soggetti che hanno vissuto sulla propria pelle l’organizzazione e lo svolgimento delle Olimpiadi Invernali senza esserne direttamente coinvolti in prima persona.

I canali di informazione privilegiati sono stati i mezzi di comunicazione di massa (TV, giornali e social media), mentre i contenuti più discussi e ricordati riguardano gare, medaglie, storie personali degli atleti, ma anche proteste e controversie. La maggior parte del campione individuato ha visto i Giochi come portatori di una legacy positiva in ambito infrastrutturale e di immagine pubblica del Paese, mentre l’impatto su ambiente, territorio e residenti delle aree coinvolte è ritenuto critico.

Dal sondaggio sono emersi diversi “eroi” e “cattivi”, individuati tra molteplici categorie. Talvolta, uno stesso soggetto è risultato essere sia positivo che negativo, sulla base delle differenti risposte. Tali dati sono andati a confermare la nostra tesi di duplice natura della realtà, ponendo la base per la realizzazione di questo progetto.`,
    sources: 'fonte placeholder',
    modelSrc: '/oggetti/bobsled.glb'
  },
  {
    id: 'peak',
    azimuth: 0.78,
    elevation: 0.56,
    label: 'Ricerca qualitativa',
    title: 'Ricerca qualitativa',
    template: 'sport',
    body: `Per comprendere a livello specifico i profili degli utenti e le motivazioni che li hanno spinti a percepire un determinato fatto o soggetto come buono o cattivo abbiamo svolto interviste con diverse persone scelte per rappresentare le idee del campione demografico di riferimento in relazione con le loro posizioni sulle Olimpiadi Milano Cortina 2026, basate sulle diverse categorie di individui emerse dal sondaggio preliminare.

Al fine di creare i commenti relativi ad ogni fatto delle 3 sezioni del sito sono state quindi poste domande aperte a 3 persone tra i 20 e 25 anni residenti a Milano ognuna con un punto di vista diverso sull’evento che volontariamente si sono sottoposte ad un intervista frontale in contesto privato.

In particolare Chiara, attivista e scrittrice laureata in Economia e Scienze Politiche; Arianna, studentessa e sportiva socialmente attiva; Nicolò, studente di ingegneria entusiasta per le opportunità create.

Attraverso le loro risposte abbiamo individuato pensieri e opinioni per ogni evento presentato nel sito in modo tale che l’utente possa confrontare e scegliere tra le diverse posizioni presentate.`,
    sources: 'fonte placeholder',
    modelSrc: '/oggetti/ice_hockey_player.glb'
  }
];

/** @deprecated Usa ABOUT_HOTSPOT_PATH */
export const ABOUT_HOTSPOTS = ABOUT_HOTSPOT_PATH;

/**
 * @param {string} id
 * @returns {number}
 */
export function getHotspotPathIndex(id) {
  return ABOUT_HOTSPOT_PATH.findIndex((h) => h.id === id);
}

/**
 * @param {string} id
 * @returns {AboutHotspot | null}
 */
export function getNextHotspot(id) {
  const index = getHotspotPathIndex(id);
  if (index < 0 || index >= ABOUT_HOTSPOT_PATH.length - 1) return null;
  return ABOUT_HOTSPOT_PATH[index + 1];
}

/**
 * @param {string} id
 * @returns {AboutHotspot | null}
 */
export function getPrevHotspot(id) {
  const index = getHotspotPathIndex(id);
  if (index <= 0) return null;
  return ABOUT_HOTSPOT_PATH[index - 1];
}

/** Distanza dalla superficie per appoggiare le card all'esterno del mesh. */
export const HOTSPOT_SURFACE_OFFSET = 0.28;

/** Sollevamento minimo sopra la mesh neve (evita z-fighting). */
export const HOTSPOT_MARKER_LIFT = 0.12;

/** Margine minimo tra camera e superficie della montagna. */
export const CAMERA_SURFACE_MARGIN = 1.2;

/**
 * Angolo orizzontale in radianti attorno alla montagna (senso orario, vista dall'alto).
 * @param {number} azimuth Frazione [0, 1) lungo il percorso
 */
function hotspotAzimuthRadians(azimuth) {
  return -azimuth * Math.PI * 2;
}

/**
 * Direzione orizzontale attorno alla montagna.
 * @param {number} azimuth Frazione [0, 1)
 */
export function hotspotHorizontalDirection(azimuth) {
  const az = hotspotAzimuthRadians(azimuth);
  return new THREE.Vector3(Math.cos(az), 0, Math.sin(az)).normalize();
}

/**
 * @param {THREE.Intersection[]} hits
 * @param {THREE.Vector3} rayDir
 * @param {number} baseY
 * @returns {THREE.Intersection | undefined}
 */
function pickVisibleSurfaceHit(hits, rayDir, baseY) {
  for (const hit of hits) {
    if (hit.point.y < baseY - 0.15) continue;
    if (hit.face == null) return hit;

    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    // Solo faccia esterna raggiunta dal raggio
    if (rayDir.dot(normal) >= 0) continue;
    if (normal.y < -0.35) continue;

    return hit;
  }
  return undefined;
}

/**
 * @param {THREE.Intersection} hit
 * @param {THREE.Vector3} horizontal
 */
function positionOnSurface(hit, horizontal) {
  const faceNormal =
    hit.face != null
      ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
      : horizontal.clone();

  const offsetNormal = new THREE.Vector3(faceNormal.x, Math.max(faceNormal.y, 0.12), faceNormal.z)
    .lerp(horizontal, 0.35)
    .normalize();

  return hit.point.clone().addScaledVector(offsetNormal, HOTSPOT_SURFACE_OFFSET);
}

/** @param {THREE.Box3} worldBox */
export function snowLineY(worldBox) {
  const size = worldBox.getSize(new THREE.Vector3());
  return worldBox.min.y + size.y * 0.16;
}

/**
 * @param {THREE.Intersection} hit
 * @param {number} snowY
 */
function isSnowSurfaceHit(hit, snowY) {
  if (hit.point.y < snowY - 0.3) return false;
  if (hit.face == null) return hit.point.y >= snowY - 0.15;

  const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
  return normal.y >= 0.14;
}

/** @param {THREE.Intersection} hit */
function positionOnSnowSurface(hit) {
  return hit.point.clone().add(new THREE.Vector3(0, HOTSPOT_MARKER_LIFT, 0));
}

/**
 * Posizione sulla neve: stesso azimuth del percorso, raycast verticale sulla calotta nevosa.
 *
 * @param {THREE.Box3} worldBox
 * @param {THREE.Object3D} mountainModel
 * @param {AboutHotspot} hotspot
 * @param {THREE.Raycaster} raycaster
 * @returns {THREE.Vector3}
 */
export function hotspotSnowPosition(worldBox, mountainModel, hotspot, raycaster) {
  const center = worldBox.getCenter(new THREE.Vector3());
  const size = worldBox.getSize(new THREE.Vector3());
  const sphere = worldBox.getBoundingSphere(new THREE.Sphere());
  const snowY = snowLineY(worldBox);
  const horizontal = hotspotHorizontalDirection(hotspot.azimuth);
  const castFromY = worldBox.min.y + size.y * 0.96;

  /** @type {number[]} */
  const shellRadii = [
    THREE.MathUtils.lerp(sphere.radius * 0.94, sphere.radius * 0.58, hotspot.elevation),
    THREE.MathUtils.lerp(sphere.radius * 0.88, sphere.radius * 0.64, hotspot.elevation),
    THREE.MathUtils.lerp(sphere.radius * 0.82, sphere.radius * 0.7, hotspot.elevation)
  ];

  for (const shellRadius of shellRadii) {
    const x = center.x + horizontal.x * shellRadius;
    const z = center.z + horizontal.z * shellRadius;
    raycaster.set(new THREE.Vector3(x, castFromY, z), new THREE.Vector3(0, -1, 0));
    const hits = raycaster.intersectObject(mountainModel, true);

    for (const hit of hits) {
      if (!isSnowSurfaceHit(hit, snowY)) continue;
      return positionOnSnowSurface(hit);
    }
  }

  return hotspotSurfacePosition(worldBox, mountainModel, hotspot, raycaster);
}

/**
 * Riaggancia un marker sulla neve (stesso XZ).
 *
 * @param {THREE.Vector3} pos
 * @param {THREE.Box3} worldBox
 * @param {THREE.Object3D} mountainModel
 * @param {THREE.Raycaster} raycaster
 * @returns {THREE.Vector3}
 */
export function snapPositionToSnowSurface(pos, worldBox, mountainModel, raycaster) {
  const size = worldBox.getSize(new THREE.Vector3());
  const snowY = snowLineY(worldBox);
  const castFromY = worldBox.min.y + size.y * 0.96;

  raycaster.set(new THREE.Vector3(pos.x, castFromY, pos.z), new THREE.Vector3(0, -1, 0));
  const hits = raycaster.intersectObject(mountainModel, true);

  for (const hit of hits) {
    if (!isSnowSurfaceHit(hit, snowY)) continue;
    return positionOnSnowSurface(hit);
  }

  return pos;
}

/**
 * Proietta un hotspot sulla superficie visibile (fianchi e parte alta).
 *
 * @param {THREE.Box3} worldBox
 * @param {THREE.Object3D} mountainModel
 * @param {AboutHotspot} hotspot
 * @param {THREE.Raycaster} raycaster
 * @returns {THREE.Vector3}
 */
export function hotspotSurfacePosition(worldBox, mountainModel, hotspot, raycaster) {
  const center = worldBox.getCenter(new THREE.Vector3());
  const size = worldBox.getSize(new THREE.Vector3());
  const sphere = worldBox.getBoundingSphere(new THREE.Sphere());
  const baseY = worldBox.min.y + size.y * 0.12;
  const horizontal = hotspotHorizontalDirection(hotspot.azimuth);
  const summitY = worldBox.min.y + size.y * 0.82;

  const bandY = THREE.MathUtils.lerp(
    baseY + size.y * 0.04,
    summitY,
    hotspot.elevation
  );

  /** @type {{ dist: number, yBias: number }[]} */
  const attempts = [
    { dist: sphere.radius * 1.35, yBias: 0 },
    { dist: sphere.radius * 1.2, yBias: size.y * 0.04 },
    { dist: sphere.radius * 1.05, yBias: -size.y * 0.03 },
    { dist: sphere.radius * 0.95, yBias: size.y * 0.07 }
  ];

  for (const { dist, yBias } of attempts) {
    const sampleY = THREE.MathUtils.clamp(bandY + yBias, baseY, summitY);
    const origin = new THREE.Vector3(
      center.x + horizontal.x * dist,
      sampleY,
      center.z + horizontal.z * dist
    );
    const aim = new THREE.Vector3(center.x, sampleY, center.z);
    const rayDir = aim.clone().sub(origin);
    if (rayDir.lengthSq() < 1e-6) continue;
    rayDir.normalize();

    raycaster.set(origin, rayDir);
    const hits = raycaster.intersectObject(mountainModel, true);
    const hit = pickVisibleSurfaceHit(hits, rayDir, baseY);
    if (hit) {
      const pos = positionOnSurface(hit, horizontal);
      pos.y = Math.max(pos.y, baseY);
      return pos;
    }
  }

  // Fallback: guscio sferico vicino alla montagna, poi micro-aggiustamento verso il mesh
  const az = hotspotAzimuthRadians(hotspot.azimuth);
  const polar = THREE.MathUtils.lerp(0.22, 0.62, hotspot.elevation);
  const shellDir = new THREE.Vector3(
    Math.cos(az) * Math.cos(polar),
    Math.sin(polar),
    Math.sin(az) * Math.cos(polar)
  ).normalize();

  const shellPoint = center.clone().addScaledVector(shellDir, sphere.radius * 0.9);
  shellPoint.y = Math.max(shellPoint.y, bandY);

  const inward = horizontal.clone().negate();
  raycaster.set(
    shellPoint.clone().addScaledVector(horizontal, HOTSPOT_SURFACE_OFFSET * 2),
    inward
  );
  const shellHits = raycaster.intersectObject(mountainModel, true);
  const shellHit = pickVisibleSurfaceHit(shellHits, inward, baseY);
  if (shellHit) {
    const pos = positionOnSurface(shellHit, horizontal);
    pos.y = Math.max(pos.y, baseY);
    return pos;
  }

  return shellPoint.addScaledVector(horizontal, HOTSPOT_SURFACE_OFFSET);
}

/**
 * Evita card troppo distanti dal volume della montagna.
 *
 * @param {THREE.Vector3} pos
 * @param {THREE.Box3} worldBox
 * @param {THREE.Object3D} mountainModel
 * @param {THREE.Vector3} horizontal
 * @param {THREE.Raycaster} raycaster
 */
export function ensureCardNearMountain(pos, worldBox, mountainModel, horizontal, raycaster) {
  const sphere = worldBox.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center;
  const dist = pos.distanceTo(center);
  const maxDist = sphere.radius + HOTSPOT_SURFACE_OFFSET * 2.2;

  if (dist <= maxDist) return pos;

  const origin = center.clone().addScaledVector(horizontal, sphere.radius * 1.25);
  origin.y = pos.y;
  const rayDir = center.clone().sub(origin).normalize();

  raycaster.set(origin, rayDir);
  const hits = raycaster.intersectObject(mountainModel, true);
  const hit = pickVisibleSurfaceHit(hits, rayDir, worldBox.min.y + worldBox.getSize(new THREE.Vector3()).y * 0.12);
  if (hit) return positionOnSurface(hit, horizontal);

  return center
    .clone()
    .addScaledVector(horizontal, sphere.radius * 0.92)
    .add(new THREE.Vector3(0, (pos.y - center.y) * 0.85, 0));
}

/**
 * Allontana posizioni troppo vicine sul piano orizzontale (Y invariato).
 *
 * @param {THREE.Vector3[]} positions
 * @param {number} [minDist]
 */
export function enforceHotspotSeparation(positions, minDist = MIN_HOTSPOT_SPACING) {
  for (let pass = 0; pass < 10; pass++) {
    let moved = false;

    for (let i = 0; i < positions.length - 1; i++) {
      const delta = new THREE.Vector3().subVectors(positions[i + 1], positions[i]);
      const horizontal = new THREE.Vector3(delta.x, 0, delta.z);
      const horizLen = horizontal.length();
      const dist = delta.length();
      if (dist >= minDist || horizLen < 1e-4) continue;

      const push = (minDist - dist) * 0.55;
      horizontal.normalize();

      positions[i + 1].addScaledVector(horizontal, push * 0.75);
      positions[i + 1].y += push * 0.28;
      positions[i].addScaledVector(horizontal, -push * 0.45);
      moved = true;
    }

    if (!moved) break;
  }
}

/**
 * Riaggancia un marker alla superficie del mesh (stesso XZ).
 *
 * @param {THREE.Vector3} pos
 * @param {THREE.Box3} worldBox
 * @param {THREE.Object3D} mountainModel
 * @param {THREE.Raycaster} raycaster
 * @returns {THREE.Vector3}
 */
export function snapPositionToMountainSurface(pos, worldBox, mountainModel, raycaster) {
  const size = worldBox.getSize(new THREE.Vector3());
  const center = worldBox.getCenter(new THREE.Vector3());
  const baseY = worldBox.min.y + size.y * 0.12;

  const horizontal = new THREE.Vector3(pos.x - center.x, 0, pos.z - center.z);
  if (horizontal.lengthSq() < 1e-6) {
    horizontal.set(0, 0, 1);
  } else {
    horizontal.normalize();
  }

  const castFromY = worldBox.min.y + size.y * 0.92;
  raycaster.set(new THREE.Vector3(pos.x, castFromY, pos.z), new THREE.Vector3(0, -1, 0));
  const hits = raycaster.intersectObject(mountainModel, true);

  for (const hit of hits) {
    if (hit.point.y < baseY - 0.15) continue;
    if (hit.face != null) {
      const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      if (normal.y < -0.35) continue;
    }
    return positionOnSurface(hit, horizontal);
  }

  return pos;
}

/**
 * @param {THREE.Box3} worldBox
 */
export function minCameraOrbitDistance(worldBox) {
  const sphere = worldBox.getBoundingSphere(new THREE.Sphere());
  return sphere.radius * 1.08;
}

/**
 * Limite massimo di allontanamento (dezoom) attorno al target.
 * @param {THREE.Box3} worldBox
 */
export function maxCameraOrbitDistance(worldBox) {
  const sphere = worldBox.getBoundingSphere(new THREE.Sphere());
  return sphere.radius * 1.48;
}

/**
 * Distanza camera ↔ card quando una carta è selezionata.
 * @param {THREE.Box3} worldBox
 * @param {boolean} [mobile]
 */
export function focusCameraDistance(worldBox, mobile = false) {
  const sphere = worldBox.getBoundingSphere(new THREE.Sphere());
  if (mobile) {
    return THREE.MathUtils.clamp(sphere.radius * 0.42, 10.0, 14.0);
  }
  return THREE.MathUtils.clamp(sphere.radius * 0.17, 4.0, 5.2);
}

/**
 * Raggio orbita sicuro per la camera attorno al centro montagna.
 * @param {THREE.Box3} worldBox
 */
export function safeOrbitRadius(worldBox) {
  const sphere = worldBox.getBoundingSphere(new THREE.Sphere());
  return sphere.radius * 1.28;
}

/**
 * Posizione camera per inquadrare un marker frontalmente (asse orizzontale verso il centro montagna).
 *
 * @param {THREE.Vector3} markerPos
 * @param {THREE.Vector3} focusPoint
 * @param {THREE.Vector3} mountainCenter
 * @param {THREE.Box3} worldBox
 * @param {boolean} [mobile]
 */
export function computeFocusCameraPosition(markerPos, focusPoint, mountainCenter, worldBox, mobile = false) {
  const outward = new THREE.Vector3().subVectors(markerPos, mountainCenter);
  outward.y = 0;
  if (outward.lengthSq() < 1e-6) outward.set(0, 0, 1);
  outward.normalize();

  const dist = focusCameraDistance(worldBox, mobile);

  return new THREE.Vector3(
    focusPoint.x + outward.x * dist,
    focusPoint.y,
    focusPoint.z + outward.z * dist
  );
}

/**
 * @param {THREE.Vector3} a
 * @param {THREE.Vector3} b
 * @param {number} t
 */
export function slerpUnitVectors(a, b, t) {
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  const omega = Math.acos(dot);
  if (omega < 1e-5) {
    return a.clone();
  }
  const s0 = Math.sin((1 - t) * omega) / Math.sin(omega);
  const s1 = Math.sin(t * omega) / Math.sin(omega);
  return new THREE.Vector3().addScaledVector(a, s0).addScaledVector(b, s1);
}

/**
 * Campiona camera e target lungo un arco esterno tra due pose.
 *
 * @param {THREE.Vector3} fromCam
 * @param {THREE.Vector3} toCam
 * @param {THREE.Vector3} fromTarget
 * @param {THREE.Vector3} toTarget
 * @param {THREE.Vector3} mountainCenter
 * @param {THREE.Box3} worldBox
 * @param {number} t
 * @returns {{ cam: THREE.Vector3, target: THREE.Vector3 }}
 */
export function sampleOrbitFocusTransition(
  fromCam,
  toCam,
  fromTarget,
  toTarget,
  mountainCenter,
  worldBox,
  t,
  options = {}
) {
  const { allowCloseFocus = false } = options;

  if (allowCloseFocus) {
    return {
      cam: new THREE.Vector3().lerpVectors(fromCam, toCam, t),
      target: new THREE.Vector3().lerpVectors(fromTarget, toTarget, t)
    };
  }

  const minR = safeOrbitRadius(worldBox);
  const fromOffset = new THREE.Vector3().subVectors(fromCam, mountainCenter);
  const toOffset = new THREE.Vector3().subVectors(toCam, mountainCenter);
  const fromR = Math.max(fromOffset.length(), minR);
  const toR = Math.max(toOffset.length(), minR);

  const fromDir = fromOffset.normalize();
  const toDir = toOffset.normalize();

  const dir = slerpUnitVectors(fromDir, toDir, t);
  const radius = THREE.MathUtils.lerp(fromR, toR, t);

  const cam = mountainCenter.clone().addScaledVector(dir, radius);
  const target = new THREE.Vector3().lerpVectors(fromTarget, toTarget, t);

  return { cam, target };
}

/**
 * Transizione morbida camera↔target: slerp sulla direzione e lerp sulla distanza
 * rispetto al target interpolato (evita lo scatto del lerp lineare in world space).
 *
 * @param {THREE.Vector3} fromCam
 * @param {THREE.Vector3} toCam
 * @param {THREE.Vector3} fromTarget
 * @param {THREE.Vector3} toTarget
 * @param {number} t
 * @returns {{ cam: THREE.Vector3, target: THREE.Vector3 }}
 */
export function sampleSmoothCameraTransition(fromCam, toCam, fromTarget, toTarget, t) {
  const target = new THREE.Vector3().lerpVectors(fromTarget, toTarget, t);

  const fromRel = new THREE.Vector3().subVectors(fromCam, fromTarget);
  const toRel = new THREE.Vector3().subVectors(toCam, toTarget);
  const fromDist = fromRel.length();
  const toDist = toRel.length();

  if (fromDist < 1e-5 || toDist < 1e-5) {
    return {
      cam: new THREE.Vector3().lerpVectors(fromCam, toCam, t),
      target
    };
  }

  const fromDir = fromRel.normalize();
  const toDir = toRel.normalize();
  const dir = slerpUnitVectors(fromDir, toDir, t);
  const dist = THREE.MathUtils.lerp(fromDist, toDist, t);

  return {
    cam: target.clone().addScaledVector(dir, dist),
    target
  };
}

/**
 * Deselezione: arco attorno al centro montagna (slerp direzione + lerp raggio)
 * senza forzare il raggio minimo orbita — evita di passare sotto la montagna.
 *
 * @param {THREE.Vector3} fromCam
 * @param {THREE.Vector3} toCam
 * @param {THREE.Vector3} fromTarget
 * @param {THREE.Vector3} toTarget
 * @param {THREE.Vector3} mountainCenter
 * @param {number} t
 * @param {{ minPhi?: number; maxPhi?: number }} [options]
 * @returns {{ cam: THREE.Vector3, target: THREE.Vector3 }}
 */
export function sampleUnfocusTransition(
  fromCam,
  toCam,
  fromTarget,
  toTarget,
  mountainCenter,
  t,
  options = {}
) {
  const minPhi = options.minPhi ?? 0.2;
  const maxPhi = options.maxPhi ?? Math.PI / 2 - 0.1;

  const fromOffset = new THREE.Vector3().subVectors(fromCam, mountainCenter);
  const toOffset = new THREE.Vector3().subVectors(toCam, mountainCenter);
  const fromR = Math.max(fromOffset.length(), 1e-4);
  const toR = Math.max(toOffset.length(), 1e-4);

  const fromDir = fromOffset.normalize();
  const toDir = toOffset.normalize();
  const dir = slerpUnitVectors(fromDir, toDir, t);
  const radius = THREE.MathUtils.lerp(fromR, toR, t);

  const cam = mountainCenter.clone().addScaledVector(dir, radius);

  const rel = new THREE.Vector3().subVectors(cam, mountainCenter);
  const sph = new THREE.Spherical().setFromVector3(rel);
  const clampedPhi = THREE.MathUtils.clamp(sph.phi, minPhi, maxPhi);
  if (clampedPhi !== sph.phi) {
    sph.phi = clampedPhi;
    rel.setFromSpherical(sph);
    cam.copy(mountainCenter).add(rel);
  }

  const target = new THREE.Vector3().lerpVectors(fromTarget, toTarget, t);

  return { cam, target };
}

/**
 * @param {THREE.PerspectiveCamera} cam
 * @param {THREE.Object3D} mountainModel
 * @param {THREE.Box3} worldBox
 * @param {THREE.Raycaster} raycaster
 * @param {number} [margin]
 * @param {{ meshRaycast?: boolean }} [options]
 */
export function clampCameraOutsideMountain(
  cam,
  mountainModel,
  worldBox,
  raycaster,
  margin = CAMERA_SURFACE_MARGIN,
  options = {}
) {
  const { meshRaycast = false } = options;
  const sphere = worldBox.getBoundingSphere(new THREE.Sphere());
  const minSphereDist = sphere.radius + margin;
  const fromCenter = new THREE.Vector3().subVectors(cam.position, sphere.center);
  const centerDist = fromCenter.length();

  if (centerDist < minSphereDist && centerDist > 1e-4) {
    cam.position.copy(sphere.center).addScaledVector(fromCenter.normalize(), minSphereDist);
  }

  if (!meshRaycast) return;

  const toCenter = new THREE.Vector3().subVectors(sphere.center, cam.position);
  if (toCenter.lengthSq() < 1e-6) return;
  toCenter.normalize();

  raycaster.set(cam.position, toCenter);
  const hits = raycaster.intersectObject(mountainModel, true);
  if (!hits.length) return;

  const hit = hits[0];
  if (hit.face == null) return;

  const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
  const distToHit = cam.position.distanceTo(hit.point);

  if (distToHit < margin + 0.08) {
    cam.position.copy(hit.point).addScaledVector(normal, margin);
  }
}

/**
 * @param {THREE.Vector3} surfacePoint
 * @param {THREE.Vector3} desiredCamPos
 * @param {THREE.Object3D} mountainModel
 * @param {THREE.Raycaster} raycaster
 * @param {number} [margin]
 * @returns {THREE.Vector3}
 */
export function clampFocusCameraPosition(surfacePoint, desiredCamPos, mountainModel, raycaster, margin = CAMERA_SURFACE_MARGIN) {
  const out = desiredCamPos.clone();
  const toCam = new THREE.Vector3().subVectors(out, surfacePoint);
  const dist = toCam.length();
  if (dist < 1e-4) return out;

  toCam.normalize();
  raycaster.set(surfacePoint, toCam);
  const hits = raycaster.intersectObject(mountainModel, true);
  if (!hits.length) return out;

  const minDist = hits[0].distance + margin;
  if (dist < minDist) {
    out.copy(surfacePoint).addScaledVector(toCam, minDist);
  }
  return out;
}

/** Frazione viewport (0–1) dove inquadrare il marker in focus — lato sinistro. */
export const FOCUS_VIEWPORT_X = 0.32;
/** Mobile: sfera centrata nello schermo. */
export const FOCUS_VIEWPORT_X_MOBILE = 0.5;
export const FOCUS_VIEWPORT_Y_MOBILE = 0.3;
/** Sollevamento camera in focus mobile (frazione altezza montagna). */
export const FOCUS_CAMERA_Y_LIFT_MOBILE = 0.18;

const _focusProj = new THREE.Vector3();
const _focusFwd = new THREE.Vector3();
const _focusRight = new THREE.Vector3();
const _focusUp = new THREE.Vector3();

/**
 * Centro visivo del marker (bbox world) per il framing camera.
 * @param {THREE.Object3D} markerRoot
 */
export function getMarkerFocusPoint(markerRoot) {
  const box = new THREE.Box3().setFromObject(markerRoot);
  const center = new THREE.Vector3();
  box.getCenter(center);
  return center;
}

/**
 * Pan parallelo di camera + target per portare `worldPoint` in una posizione viewport (0–1).
 * @param {THREE.PerspectiveCamera} camera
 * @param {THREE.Vector3} target
 * @param {THREE.Vector3} worldPoint
 * @param {number} [viewportX]
 * @param {number} [viewportY]
 */
export function panFocusToViewport(
  camera,
  target,
  worldPoint,
  viewportX = FOCUS_VIEWPORT_X,
  viewportY = 0.5
) {
  const desiredNdcX = viewportX * 2 - 1;
  const desiredNdcY = 1 - viewportY * 2;
  const tanHalfFov = Math.tan((camera.fov * Math.PI) / 360);

  camera.lookAt(target);

  for (let i = 0; i < 8; i++) {
    _focusProj.copy(worldPoint).project(camera);
    const deltaX = desiredNdcX - _focusProj.x;
    const deltaY = desiredNdcY - _focusProj.y;
    if (Math.abs(deltaX) < 0.008 && Math.abs(deltaY) < 0.008) break;

    const dist = camera.position.distanceTo(target);
    const shiftX = deltaX * dist * tanHalfFov * camera.aspect;
    const shiftY = -deltaY * dist * tanHalfFov;

    camera.getWorldDirection(_focusFwd);
    _focusRight.crossVectors(camera.up, _focusFwd).normalize();
    _focusUp.copy(camera.up).normalize();

    camera.position.addScaledVector(_focusRight, shiftX);
    camera.position.addScaledVector(_focusUp, shiftY);
    target.addScaledVector(_focusRight, shiftX);
    target.addScaledVector(_focusUp, shiftY);
    camera.lookAt(target);
  }
}

/**
 * Pan parallelo di camera + target per portare `worldPoint` sul lato sinistro del viewport.
 * @param {THREE.PerspectiveCamera} camera
 * @param {THREE.Vector3} target
 * @param {THREE.Vector3} worldPoint
 * @param {number} [viewportX]
 */
export function panFocusToViewportX(camera, target, worldPoint, viewportX = FOCUS_VIEWPORT_X) {
  const desiredNdcX = viewportX * 2 - 1;

  camera.lookAt(target);

  for (let i = 0; i < 6; i++) {
    _focusProj.copy(worldPoint).project(camera);
    const delta = desiredNdcX - _focusProj.x;
    if (Math.abs(delta) < 0.008) break;

    const dist = camera.position.distanceTo(target);
    const shift = delta * dist * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;

    camera.getWorldDirection(_focusFwd);
    _focusRight.crossVectors(camera.up, _focusFwd).normalize();

    camera.position.addScaledVector(_focusRight, shift);
    target.addScaledVector(_focusRight, shift);
    camera.lookAt(target);
  }
}
