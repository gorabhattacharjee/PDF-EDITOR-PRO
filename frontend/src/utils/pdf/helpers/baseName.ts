export function baseName(name: string | undefined, fallback: string): string {
  if (!name) {
    return fallback;
  }
  const lastDot = name.lastIndexOf(".");
  if (lastDot === -1) {
    return name;
  }
  return name.substring(0, lastDot);
}