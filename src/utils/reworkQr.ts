/** Rework QR: exactly four parameters; parameter four is the serial number. */
export function parseReworkQr(value: string): string {
  const content = value.trim();
  const delimiters = [";", ",", "|"].filter((delimiter) => content.includes(delimiter));
  const parts = delimiters.length === 1
    ? content.split(delimiters[0]).map((part) => part.trim())
    : content.split(/\s+/);
  if (content.length > 2048 || delimiters.length > 1 || parts.length !== 4 ||
      parts.some((part) => !part) || parts[3].length > 100 || /\s/.test(parts[3])) {
    throw new Error("QR tidak valid. Gunakan 4 parameter dengan serial number di posisi ke-4, dipisahkan titik koma (;), koma (,), pipe (|), atau spasi secara konsisten.");
  }
  return parts[3];
}
