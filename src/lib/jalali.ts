import DateObject from "react-date-object";
import gregorian from "react-date-object/calendars/gregorian";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

const faNumber = new Intl.NumberFormat("fa-IR", { useGrouping: false });

export function formatFaNumber(value: number) {
  return faNumber.format(value);
}

export function formatJalaliPretty(isoOrDate: string | Date) {
  const iso =
    typeof isoOrDate === "string"
      ? isoOrDate.slice(0, 10)
      : isoOrDate.toISOString().slice(0, 10);
  if (!/^(\d{4})-(\d{2})-(\d{2})$/.test(iso)) return null;
  return new DateObject({
    calendar: gregorian,
    format: "YYYY-MM-DD",
    date: iso
  })
    .convert(persian, persian_fa)
    .format("D MMMM YYYY");
}
