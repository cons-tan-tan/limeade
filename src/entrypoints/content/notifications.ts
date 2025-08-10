interface Observer {
  start(): void;
  stop(): void;
  setTarget(target: Node): Observer;
}

function createObserver(
  callback: (mutations: MutationRecord[], observer: Observer) => void,
): Observer {
  let observer: MutationObserver | null = null;
  let target: Node | null = null;

  const option = {
    subtree: true,
    childList: true,
  };

  const observerInstance: Observer = {
    start: () => {
      if (!observer && target) {
        observer = new MutationObserver((mutations) =>
          callback(mutations, observerInstance),
        );
        observer.observe(target, option);
      }
    },
    stop: () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    },
    setTarget: (newTarget: Node) => {
      target = newTarget;
      return observerInstance;
    },
  };

  return observerInstance;
}

const filter = "Backlog*";

export const notificationBarObserver = createObserver(() => {
  if (!filter) return; // フィルターが空文字の場合は何もしない
  const regexp = new RegExp(filter);
  const notificationContainerList = document.getElementsByClassName(
    "notistack-SnackbarContainer",
  );
  if (notificationContainerList.length === 0) return;
  for (const notification of notificationContainerList[0].children) {
    const notificationHTML = notification as HTMLElement;
    if (notificationHTML.style.display === "none") continue;
    const notificationText = notificationHTML.querySelector(
      "#notistack-snackbar",
    )?.textContent as string;
    if (!regexp.test(notificationText)) continue;
    notificationHTML.style.display = "none"; // noneにするといい感じに消える
  }
}).setTarget(document.body);
