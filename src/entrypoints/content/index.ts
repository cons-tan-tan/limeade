import { notificationBarObserver } from "@/entrypoints/content/notifications.ts";

export default defineContentScript({
  matches: ["https://www.it.toshin-correction.com/*"],
  main() {
    console.log("hello limeade!");
    notificationBarObserver.start();
  },
});
