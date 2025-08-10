interface Observer {
  start(): void;
  stop(): void;
  setTarget(target: Element): Observer;
  setImmediate(): Observer;
}

function createObserver(
  callback: (
    mutations: MutationRecord[],
    observer: Observer,
    target: Element,
  ) => void,
): Observer {
  let observer: MutationObserver | null = null;
  let target: Element | null = null;
  let shouldRunImmediately = false;

  const option: MutationObserverInit = {
    subtree: true,
    childList: true,
  };

  const observerInstance: Observer = {
    start: () => {
      if (!observer && target) {
        observer = new MutationObserver((mutations) => {
          if (target) {
            callback(mutations, observerInstance, target);
          }
        });
        observer.observe(target, option);

        // immediate実行
        if (shouldRunImmediately) {
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
    setTarget: (newTarget: Element) => {
      target = newTarget;
      return observerInstance;
    },
    setImmediate: () => {
      shouldRunImmediately = true;
      return observerInstance;
    },
  };

  return observerInstance;
}

const filter = "Backlog*";

// 既に監視されているコンテナを管理するWeakSet
const observedContainers = new WeakSet<Element>();

// 通知内容を監視する
const notificationContentObserver = createObserver(
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
      notificationHTML.style.display = "none"; // noneにするといい感じに消える
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
    notificationContentObserver.setTarget(container).start();
  }
}).setTarget(document.body);
