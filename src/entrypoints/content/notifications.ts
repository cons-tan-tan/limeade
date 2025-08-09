interface Observer {
  start(): void;
  stop(): void;
}

function createObserver(logic: () => void): Observer {
  return {
    start: () => {},
    stop: () => {},
  };
}

export const notificationBarObserver = createObserver(() => {});
