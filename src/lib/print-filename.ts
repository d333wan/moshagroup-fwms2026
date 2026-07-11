/**
 * Set document.title to `<name>-<YYYY-MM-DD>` before opening the browser
 * print dialog, then restore the original title. Most browsers use the
 * current document.title as the default "Save as PDF" filename.
 */
export function printWithFilename(name: string) {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const safe = name.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
  const filename = `${safe}-${stamp}`;
  const prev = document.title;
  document.title = filename;
  const restore = () => {
    document.title = prev;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
  // Fallback restore in case afterprint doesn't fire (older Safari)
  setTimeout(restore, 2000);
}
