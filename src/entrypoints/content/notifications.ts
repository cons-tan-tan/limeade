import { parse } from "@marcbachmann/cel-js";
import { createObserverBuilder } from "@/lib/observer.ts";

// https://notistack.com/features/customization を参照
const NOTIFICATION_TYPES = [
  "default",
  "success",
  "error",
  "warning",
  "info",
] as const;
type NotificationType = (typeof NOTIFICATION_TYPES)[number];
function isNotificationType(value: string): value is NotificationType {
  return NOTIFICATION_TYPES.includes(value as NotificationType);
}

interface Notification {
  type: NotificationType;
  text: string;
}

const checkBacklogWikiError = parse<boolean>(
  'type == "error" && text.contains("BacklogWiki")',
);

// 既に監視されているコンテナを管理するWeakSet
const observedContainers = new WeakSet<Element>();

// 通知内容を監視するBuilder
const notificationContentBuilder = createObserverBuilder((_, observer) => {
  for (const notificationElement of observer.getTarget().children) {
    if (!(notificationElement instanceof HTMLElement)) continue;
    // 既に消したものは除外
    if (notificationElement.style.display === "none") continue;

    const notificationContentElement = notificationElement.querySelector(
      ".notistack-MuiContent",
    );
    if (!notificationContentElement) continue;
    // クラス名から通知の種類を特定
    const match = notificationContentElement.className.match(
      /notistack-MuiContent-(\w+)/,
    );
    if (!match) continue;
    const classNamePrefix = match[1];
    if (!isNotificationType(classNamePrefix)) continue;
    // CEL用のオブジェクトを作成
    const notification: Notification = {
      type: classNamePrefix,
      text: notificationElement.innerText,
    };
    // フィルターにマッチしなければスキップ
    if (!checkBacklogWikiError(notification)) continue;

    // noneにすると表示上の齟齬無く消せる
    // 要素自体を削除するとエラーが起こる
    notificationElement.style.display = "none";
  }
}).setImmediate();

// 通知コンテナ出現を監視する
export const notificationPresenceObserver = createObserverBuilder(
  (mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        // 通知コンテナに限定
        if (!node.classList.contains("notistack-SnackbarContainer")) continue;
        // 既に監視中であればスキップ
        if (observedContainers.has(node)) continue;
        // WeakSetに追加して重複を防ぐ
        observedContainers.add(node);
        // コンテナ内容監視を開始
        notificationContentBuilder.setTarget(node).build().start();
      }
    }
  },
)
  .setTarget(document.body)
  .build();
