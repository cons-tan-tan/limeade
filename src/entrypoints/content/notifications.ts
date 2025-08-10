interface Observer {
  start(): void;
  stop(): void;
}

interface ObserverBuilder {
  setTarget(target: Element): ObserverBuilder;
  setImmediate(): ObserverBuilder;
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
): Observer {
  let observer: MutationObserver | null = null;

  const option: MutationObserverInit = {
    subtree: true,
    childList: true,
  };

  const observerInstance: Observer = {
    start: () => {
      if (!observer) {
        observer = new MutationObserver((mutations) => {
          callback(mutations, observerInstance, target);
        });
        observer.observe(target, option);

        // immediate実行
        if (immediate) {
          callback([], observerInstance, target);
        }
      }
    },
    stop: () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    },
  };

  return observerInstance;
}

function createObserverBuilder(
  callback: (
    mutations: MutationRecord[],
    observer: Observer,
    target: Element,
  ) => void,
): ObserverBuilder {
  let builderTarget: Element | null = null;
  let builderImmediate = false;

  const builderInstance: ObserverBuilder = {
    setTarget: (target: Element) => {
      builderTarget = target;
      return builderInstance;
    },
    setImmediate: () => {
      builderImmediate = true;
      return builderInstance;
    },
    build: () => {
      if (!builderTarget) {
        throw new Error("Target is required. Use setTarget() before build().");
      }
      return createObserver(callback, builderTarget, builderImmediate);
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
export const notificationPresenceObserver = createObserver(() => {
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
}, document.body);
