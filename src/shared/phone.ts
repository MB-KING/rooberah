const IRAN_MOBILE = /^09\d{9}$/;

export function normalizePhone(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  let phone = digits;
  if (phone.startsWith("98") && phone.length === 12) {
    phone = `0${phone.slice(2)}`;
  }
  if (phone.startsWith("9") && phone.length === 10) {
    phone = `0${phone}`;
  }
  return IRAN_MOBILE.test(phone) ? phone : null;
}

export function formatPhone(value?: string | null) {
  const phone = normalizePhone(value);
  if (!phone) return null;
  return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
}
