/** Gregorian ↔ Jalali helpers (jalaali-js algorithm). */

export type JalaliDate = { jy: number; jm: number; jd: number };

export function isJalaliLeap(jy: number) {
  return jalCal(jy).leap === 0;
}

export function jalaliMonthLength(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}

export function toJalali(gy: number, gm: number, gd: number): JalaliDate {
  return d2j(g2d(gy, gm, gd));
}

export function toGregorian(jy: number, jm: number, jd: number) {
  return d2g(j2d(jy, jm, jd));
}

export function gregorianIsoFromJalali(j: JalaliDate) {
  const { gy, gm, gd } = toGregorian(j.jy, j.jm, j.jd);
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}

export function jalaliFromGregorianIso(iso: string): JalaliDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return toJalali(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function formatJalaliDisplay(j: JalaliDate) {
  return `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`;
}

export function formatJalaliPretty(isoOrDate: string | Date) {
  const iso =
    typeof isoOrDate === "string"
      ? isoOrDate.slice(0, 10)
      : new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Tehran",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }).format(isoOrDate);
  const jalali = jalaliFromGregorianIso(iso);
  if (!jalali) return null;
  return `${formatFaNumber(jalali.jd)} ${jalaliMonthNames[jalali.jm - 1]} ${formatFaNumber(jalali.jy)}`;
}

export function todayJalali(): JalaliDate {
  // Use Tehran calendar day, not the server's local timezone.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const gy = Number(parts.find((part) => part.type === "year")?.value);
  const gm = Number(parts.find((part) => part.type === "month")?.value);
  const gd = Number(parts.find((part) => part.type === "day")?.value);
  return toJalali(gy, gm, gd);
}

export const jalaliMonthNames = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند"
] as const;

export const jalaliWeekdayNames = [
  "ش",
  "ی",
  "د",
  "س",
  "چ",
  "پ",
  "ج"
] as const;

/** Saturday-first weekday index for Jalali calendars in Iran. */
export function jalaliWeekdayIndex(j: JalaliDate) {
  const g = toGregorian(j.jy, j.jm, j.jd);
  const date = new Date(g.gy, g.gm - 1, g.gd);
  return (date.getDay() + 1) % 7;
}

export function formatFaNumber(value: number) {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function div(a: number, b: number) {
  return ~~(a / b);
}

function mod(a: number, b: number) {
  return a - ~~(a / b) * b;
}

function jalCal(jy: number) {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
    2192, 2262, 2324, 2394, 2456, 3178
  ];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jump = 0;
  let leap = 0;
  let n = 0;
  let i = 1;

  if (jy < jp || jy >= breaks[bl - 1]) {
    throw new Error(`Invalid Jalali year ${jy}`);
  }

  for (i = 1; i < bl; i += 1) {
    const jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;

  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33;
  }
  leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return (
    g2d(r.gy, 3, r.march) +
    (jm - 1) * 31 -
    div(jm, 7) * (jm - 7) +
    jd -
    1
  );
}

function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm = 0;
  let jd = 0;

  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

function g2d(gy: number, gm: number, gd: number) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}
