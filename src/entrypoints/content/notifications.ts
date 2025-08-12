import { parse } from "@marcbachmann/cel-js";
import { createObserver } from "@/lib/observer.ts";

// https://notistack.com/features/customization を参照
const NOTIFICATION_TYPES = [
  "default",
  "success",
  "error",
  "warning",
  "info",
] as const;
type NotificationType = (typeof NOTIFICATION_TYPES)[number];
const isNotificationType = (v: string): v is NotificationType =>
  (NOTIFICATION_TYPES as readonly string[]).includes(v);

// CEL用定義
interface Notification {
  type: NotificationType;
  text: string;
}
const checkBacklogWikiError = parse<boolean>(
  'type == "error" && text.contains("BacklogWiki")',
);

// 二重監視防止
const observedContainers = new WeakSet<Element>();

// ノードがDOMから外れたら abort するユーティリティ
function autoAbortWhenDetached(node: Node): AbortSignal {
  const ac = new AbortController();
  const observer = createObserver(
    () => {
      if (!node.isConnected) {
        ac.abort();
        observer.dispose();
      }
    },
    {
      target: document.body,
      options: { childList: true, subtree: true },
    },
  );
  observer.start();
  return ac.signal;
}

// 1つの通知要素を処理
function tryHideIfMatches(element: HTMLElement) {
  // 既に消したものは除外
  if (element.style.display === "none") return;

  const content = element.querySelector(".notistack-MuiContent");
  if (!(content instanceof HTMLElement)) return;

  // 'notistack-MuiContent-success' などを classList から抽出
  const cls = [...content.classList].find((c) =>
    c.startsWith("notistack-MuiContent-"),
  );
  if (!cls) return;

  // クラス名から通知の種類を特定
  const type = cls.slice("notistack-MuiContent-".length);
  if (!isNotificationType(type)) return;

  // CEL用のオブジェクトを作成
  const notif: Notification = {
    type,
    text: element.textContent ?? "",
  };

  if (!checkBacklogWikiError(notif)) return;
  // noneにすると表示上の齟齬無く消せる
  // 要素自体を削除するとエラーが起こる
  element.style.display = "none";
}

// コンテナ内の監視を開始（初回は全スキャン、その後は addedNodes のみ）
function startNotificationContentObserver(container: Element) {
  const signal = autoAbortWhenDetached(container);

  return createObserver(
    (mutations) => {
      if (mutations.length === 0) {
        // immediate: 初回だけ全走査
        for (const child of Array.from(container.children)) {
          if (child instanceof HTMLElement) tryHideIfMatches(child);
        }
        return;
      }
      // 追加分だけ処理
      for (const m of mutations) {
        for (const n of Array.from(m.addedNodes)) {
          if (n instanceof HTMLElement) tryHideIfMatches(n);
        }
      }
    },
    {
      target: container,
      options: { childList: true },
      immediate: true,
      signal,
    },
  ).start();
}

// ── コンテナ出現監視 ───────────────────────────────────────────
export const notificationPresenceObserver = createObserver(
  (mutations) => {
    for (const m of mutations) {
      for (const n of Array.from(m.addedNodes)) {
        if (!(n instanceof Element)) continue;
        // 通知コンテナに限定
        if (!n.classList.contains("notistack-SnackbarContainer")) continue;
        // 既に監視中であればスキップ
        if (observedContainers.has(n)) continue;

        // WeakSetに追加して重複を防ぐ
        observedContainers.add(n);
        // コンテナ内容監視を開始
        startNotificationContentObserver(n); // 見つかった時点で開始
      }
    }
  },
  {
    target: document.body,
    options: { childList: true },
    immediate: false,
  },
);
