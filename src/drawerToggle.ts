import OpenSeadragon from 'openseadragon';
import type { ConfigurationWidget } from 'osd-paperjs-annotation';
import type {
  ConfigurationWidgetOptions,
  DrawerToggleChoice,
  DrawerToggleOptions,
  PaperOverlaysOptions,
} from './types';

const CONFIG_DOC_VERSION = 1;
const DEFAULT_CHOICES: DrawerToggleChoice[] = ['canvas', 'webgl'];
const DEFAULT_PERSIST_KEY = 'drawer';
const DEFAULT_SECTION_LABEL = 'Rendering';

const CHOICE_LABELS: Record<DrawerToggleChoice, string> = {
  canvas: 'Canvas',
  webgl: 'WebGL',
};

type DrawerCapableDrawer = {
  getType?: () => string;
};

type DrawerCapableViewer = OpenSeadragon.Viewer & {
  drawer?: DrawerCapableDrawer;
  requestDrawer?: (
    drawerCandidate: string,
    options?: { mainDrawer?: boolean; redrawImmediately?: boolean },
  ) => unknown;
};

type DrawerConstructor = {
  isSupported?: () => boolean;
};

type DrawerCapableOpenSeadragon = typeof OpenSeadragon & {
  determineDrawer?: (id: string) => DrawerConstructor | null;
};

function asDrawerViewer(viewer: OpenSeadragon.Viewer): DrawerCapableViewer {
  return viewer as DrawerCapableViewer;
}

function isDrawerChoice(value: string): value is DrawerToggleChoice {
  return value === 'canvas' || value === 'webgl';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function mergeDrawerToggleOptions(
  paperOverlays: PaperOverlaysOptions,
  cwOpts?: ConfigurationWidgetOptions,
): DrawerToggleOptions | undefined {
  const top = paperOverlays.drawerToggle;
  const nested =
    cwOpts && isPlainObject(cwOpts) ? cwOpts.drawerToggle : undefined;
  if (!top && !nested) return undefined;
  const merged: DrawerToggleOptions = { ...top, ...nested };
  if (top?.enabled !== true && nested?.enabled !== true) return undefined;
  return { ...merged, enabled: true };
}

function resolveDrawerStorageKey(
  opts: DrawerToggleOptions,
  cwOpts?: ConfigurationWidgetOptions,
): string | undefined {
  if (opts.storageKey != null && String(opts.storageKey).trim() !== '') {
    return String(opts.storageKey);
  }
  const cwKey = cwOpts?.storageKey;
  if (cwKey != null && String(cwKey).trim() !== '') {
    return String(cwKey);
  }
  return undefined;
}

function loadPersistedDoc(storageKey: string): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { v: CONFIG_DOC_VERSION, overlays: {} };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { v: CONFIG_DOC_VERSION, overlays: {} };
    }
    const doc = parsed as Record<string, unknown>;
    if (!doc.overlays || typeof doc.overlays !== 'object' || Array.isArray(doc.overlays)) {
      doc.overlays = {};
    }
    return doc;
  } catch {
    return { v: CONFIG_DOC_VERSION, overlays: {} };
  }
}

export function loadPersistedDrawer(
  storageKey: string,
  persistKey: string,
): DrawerToggleChoice | undefined {
  const doc = loadPersistedDoc(storageKey);
  const value = doc[persistKey];
  return typeof value === 'string' && isDrawerChoice(value) ? value : undefined;
}

export function savePersistedDrawer(
  storageKey: string,
  persistKey: string,
  drawer: DrawerToggleChoice,
): void {
  try {
    const doc = loadPersistedDoc(storageKey);
    doc.v = CONFIG_DOC_VERSION;
    doc[persistKey] = drawer;
    localStorage.setItem(storageKey, JSON.stringify(doc));
  } catch {
    /* quota / private mode */
  }
}

export function isDrawerSupported(type: DrawerToggleChoice): boolean {
  const osd = OpenSeadragon as DrawerCapableOpenSeadragon;
  const Drawer = osd.determineDrawer?.(type);
  if (!Drawer?.isSupported) return false;
  try {
    return Drawer.isSupported();
  } catch {
    return false;
  }
}

function getCurrentDrawerType(viewer: DrawerCapableViewer): string | undefined {
  return viewer.drawer?.getType?.();
}

function applyDrawer(viewer: DrawerCapableViewer, type: DrawerToggleChoice): boolean {
  const result = viewer.requestDrawer?.(type, { mainDrawer: true });
  return result !== false && result != null;
}

function drawerFromOsdOption(drawer: unknown): DrawerToggleChoice | undefined {
  if (typeof drawer === 'string' && isDrawerChoice(drawer)) return drawer;
  if (Array.isArray(drawer)) {
    for (const candidate of drawer) {
      if (typeof candidate === 'string' && isDrawerChoice(candidate)) return candidate;
    }
  }
  return undefined;
}

function resolveInitialDrawer(
  viewer: DrawerCapableViewer,
  opts: DrawerToggleOptions,
  osdDrawer: unknown,
  storageKey: string | undefined,
  persistKey: string,
): DrawerToggleChoice | undefined {
  const persist = opts.persist !== false && !!storageKey;
  if (persist && storageKey) {
    const stored = loadPersistedDrawer(storageKey, persistKey);
    if (stored) return stored;
  }
  if (opts.defaultDrawer) return opts.defaultDrawer;
  const fromOsd = drawerFromOsdOption(osdDrawer);
  if (fromOsd) return fromOsd;
  const current = getCurrentDrawerType(viewer);
  return current && isDrawerChoice(current) ? current : undefined;
}

function syncSelectToDrawer(select: HTMLSelectElement, viewer: DrawerCapableViewer): void {
  const type = getCurrentDrawerType(viewer);
  if (type && [...select.options].some((o) => o.value === type)) {
    select.value = type;
  }
}

function attachDrawerConfigurationSection(
  viewer: DrawerCapableViewer,
  cw: ConfigurationWidget,
  opts: DrawerToggleOptions,
  storageKey: string | undefined,
  persistKey: string,
): void {
  const choices = (opts.choices ?? DEFAULT_CHOICES).filter((c) => isDrawerChoice(c));
  const supportedChoices = choices.filter((c) => isDrawerSupported(c));
  if (supportedChoices.length === 0) return;

  const root = document.createElement('div');
  root.className = 'osdplus-drawer-toggle';
  root.style.fontFamily =
    'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  root.style.fontSize = '13px';

  const select = document.createElement('select');
  select.setAttribute('aria-label', opts.sectionLabel ?? DEFAULT_SECTION_LABEL);

  for (const choice of supportedChoices) {
    const option = document.createElement('option');
    option.value = choice;
    option.textContent = CHOICE_LABELS[choice] ?? choice;
    if (!isDrawerSupported(choice)) {
      option.disabled = true;
    }
    select.appendChild(option);
  }

  const unsupported = choices.filter((c) => !supportedChoices.includes(c));
  if (unsupported.includes('webgl')) {
    console.warn(
      '[OSDPlus] WebGL drawer is not supported in this environment; WebGL option omitted.',
    );
  }

  syncSelectToDrawer(select, viewer);

  const persist = opts.persist !== false && !!storageKey;

  select.addEventListener('change', () => {
    const type = select.value;
    if (!isDrawerChoice(type)) return;
    const ok = applyDrawer(viewer, type);
    if (ok) {
      if (persist && storageKey) {
        savePersistedDrawer(storageKey, persistKey, type);
      }
    } else {
      syncSelectToDrawer(select, viewer);
    }
  });

  root.appendChild(select);
  cw.addSection(opts.sectionLabel ?? DEFAULT_SECTION_LABEL, root);
}

export function installDrawerToggle(
  viewer: OpenSeadragon.Viewer,
  paperOverlays: PaperOverlaysOptions,
  osdDrawer: unknown,
  configurationWidget?: ConfigurationWidget,
  configurationWidgetOpts?: ConfigurationWidgetOptions,
): void {
  const opts = mergeDrawerToggleOptions(paperOverlays, configurationWidgetOpts);
  if (!opts?.enabled) return;

  const persistKey = opts.persistKey ?? DEFAULT_PERSIST_KEY;
  const storageKey = resolveDrawerStorageKey(opts, configurationWidgetOpts);
  const drawerViewer = asDrawerViewer(viewer);

  viewer.addOnceHandler('open', () => {
    const target = resolveInitialDrawer(
      drawerViewer,
      opts,
      osdDrawer,
      storageKey,
      persistKey,
    );
    if (target && isDrawerSupported(target)) {
      const current = getCurrentDrawerType(drawerViewer);
      if (current !== target) {
        applyDrawer(drawerViewer, target);
      }
    }

    if (configurationWidget) {
      attachDrawerConfigurationSection(
        drawerViewer,
        configurationWidget,
        opts,
        storageKey,
        persistKey,
      );
    }
  });
}
