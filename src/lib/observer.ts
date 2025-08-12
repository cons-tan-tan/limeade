type ImmediateSchedule = "sync" | "microtask" | "raf";

export interface Observer<T extends Element = Element> {
  start(): void;
  stop(): void;
  dispose(): void;
  readonly target: T;
  readonly isRunning: boolean;
}

export interface CreateObserverOptions<T extends Element> {
  target: T;
  options?: MutationObserverInit;
  immediate?: boolean;
  schedule?: ImmediateSchedule;
  signal?: AbortSignal;
}

export function createObserver<T extends Element>(
  callback: (mutations: MutationRecord[], obs: Observer<T>) => void,
  cfg: CreateObserverOptions<T>,
): Observer<T> {
  const {
    target,
    immediate = false,
    schedule = "microtask",
    signal,
    options,
  } = cfg;

  // デフォルトをマージ（明示オプションで上書き）
  const opts: MutationObserverInit = { childList: true, ...options };

  let mo: MutationObserver | null = null;
  let running = false;

  const runImmediate = () => {
    const fire = () => callback([], api);
    switch (schedule) {
      case "microtask":
        queueMicrotask(fire);
        break;
      case "raf":
        requestAnimationFrame(() => fire());
        break;
      default:
        fire();
    }
  };

  const start = () => {
    if (running) return;
    mo = new MutationObserver((mutations) => callback(mutations, api));
    mo.observe(target, opts);
    running = true;

    if (signal) {
      if (signal.aborted) {
        stop();
        return;
      }
      // 一度だけstopを紐づける
      signal.addEventListener("abort", stop, { once: true });
    }

    if (immediate) runImmediate();
  };

  const stop = () => {
    if (!running) return;
    mo?.disconnect();
    mo = null;
    running = false;
  };

  const api: Observer<T> = {
    start,
    stop,
    dispose: stop,
    get target() {
      return target;
    },
    get isRunning() {
      return running;
    },
  };

  return Object.freeze(api);
}
