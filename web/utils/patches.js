export function supportWorkers() {
  const OriginalWorker = window.Worker;
  if (!OriginalWorker) return;
  window.Worker = function workerProxy(scriptURL, options) {
    if (
      typeof scriptURL === "string" &&
      (scriptURL.startsWith("http") || scriptURL.startsWith("//"))
    ) {
      const blob = new Blob([`importScripts("${scriptURL}");`], {
        type: "application/javascript",
      });
      return new OriginalWorker(URL.createObjectURL(blob), options);
    }
    return new OriginalWorker(scriptURL, options);
  };
}

export function clearConsole() {
  console.clear();
}
