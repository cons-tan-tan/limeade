interface Observer {
  start(): void;
  stop(): void;
}

interface ObserverBuilder {
  setTarget(target: Element): ObserverBuilder;
  setImmediate(): ObserverBuilder;
  setOptions(options: MutationObserverInit): ObserverBuilder;
  build(): Observer;
}

function createObserver(
  callback: (
    mutations: MutationRecord[],
    observer: Observer,
    target: Element,
  ) => void,
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
          callback(mutations, observer, target);
        });
        mutationObserver.observe(target, option);

        // immediate実行
        if (immediate) {
          callback([], observer, target);
        }
      }
    },
    stop: () => {
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
    },
  };

  return observer;
}

function createObserverBuilder(
  callback: (
    mutations: MutationRecord[],
    observer: Observer,
    target: Element,
  ) => void,
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

const filter = "Backlog*";

// 既に監視されているコンテナを管理するWeakSet
const observedContainers = new WeakSet<Element>();

// 通知内容を監視するBuilder
const notificationContentBuilder = createObserverBuilder(
  (_mutations, _observer, target) => {
    if (!filter) return;
    const regexp = new RegExp(filter);

    for (const notification of target.children) {
      const notificationHTML = notification as HTMLElement;
      if (notificationHTML.style.display === "none") continue;
      const notificationText = notificationHTML.querySelector(
        "#notistack-snackbar",
      )?.textContent as string;
      if (!regexp.test(notificationText)) continue;
      // noneにするといい感じに消える
      notificationHTML.style.display = "none";
    }
  },
).setImmediate();

// 通知コンテナ出現を監視する
export const notificationPresenceObserver = createObserverBuilder(() => {
  const containers = document.getElementsByClassName(
    "notistack-SnackbarContainer",
  );

  for (const container of containers) {
    // 既に監視されている場合はスキップ
    if (observedContainers.has(container)) continue;

    // WeakSetに追加して重複を防ぐ
    observedContainers.add(container);

    // コンテナ内容監視を開始
    notificationContentBuilder.setTarget(container).build().start();
  }
})
  .setTarget(document.body)
  .build();
