/**
 * Utilidades estándar de formateo para el sistema BevAdmin Pro.
 */

/**
 * Formatea una fecha u hora ISO a la representación canónica: "YYYY-MM-DD HH:mm:ss".
 * Maneja valores como "2026-11-20T19:34:52.353Z", fechas Date, strings timestamp o fechas relativas.
 *
 * @param value fecha en formato ISO, Timestamp, Date o string representativo.
 * @returns texto normalizado en formato YYYY-MM-DD HH:mm:ss
 */
export function formatAppDate(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    // 1. Coincidencia directa con ISO-8601 YYYY-MM-DDTHH:mm:ss...
    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]} ${isoMatch[2]}`;
    }
    // 2. Si ya viene en formato exacto YYYY-MM-DD HH:mm:ss
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // 3. Si viene como solo fecha YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return `${trimmed} 00:00:00`;
    }
    // 4. Intentar parsear como Date estándar
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    return trimmed;
  }

  if (value instanceof Date && !isNaN(value.getTime())) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }

  return String(value);
}

/**
 * Formatea un monto numérico con separador de miles por coma (,) y decimales por punto (.)
 * con 2 decimales fijos (ej. 1,234.50).
 *
 * @param value número o string numérico a formatear.
 * @returns texto formateado con coma de miles y punto de decimales.
 */
export function formatAmount(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '0.00';
  }
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) {
    return '0.00';
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Devuelve la fecha y hora actual en formato estándar canónico: "YYYY-MM-DD HH:mm:ss".
 */
export function formatCurrentDateTime(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
