export interface Observer {
  start(): void;
  stop(): void;
  getTarget(): Element;
}

export interface ObserverBuilder {
  setTarget(target: Element): ObserverBuilder;
  setImmediate(): ObserverBuilder;
  setOptions(options: MutationObserverInit): ObserverBuilder;
  build(): Observer;
}

function createObserver(
  callback: (mutations: MutationRecord[], observer: Observer) => void,
  target: Element,
  immediate = false,
  options?: MutationObserverInit,
): Observer {
  let mutationObserver: MutationObserver | null = null;

  const option: MutationObserverInit = options || {
    childList: true,
  };

  const observer: Observer = {
    start: () => {
      if (!mutationObserver) {
        mutationObserver = new MutationObserver((mutations) => {
          callback(mutations, observer);
        });
        mutationObserver.observe(target, option);

        // immediate実行
        if (immediate) {
          callback([], observer);
        }
      }
    },
    stop: () => {
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
    },
    getTarget: () => {
      return target;
    },
  };

  return observer;
}

export function createObserverBuilder(
  callback: (mutations: MutationRecord[], observer: Observer) => void,
): ObserverBuilder {
  let observerTarget: Element | null = null;
  let observerImmediate = false;
  let observerOptions: MutationObserverInit | undefined;

  const builderInstance: ObserverBuilder = {
    setTarget: (target: Element) => {
      observerTarget = target;
      return builderInstance;
    },
    setImmediate: () => {
      observerImmediate = true;
      return builderInstance;
    },
    setOptions: (options: MutationObserverInit) => {
      observerOptions = options;
      return builderInstance;
    },
    build: () => {
      if (!observerTarget) {
        throw new Error("Target is required. Use setTarget() before build().");
      }
      return createObserver(
        callback,
        observerTarget,
        observerImmediate,
        observerOptions,
      );
    },
  };

  return builderInstance;
}
