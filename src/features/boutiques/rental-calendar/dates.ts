const validMonth = (month: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && Number(month.slice(0, 4)) >= 2000 && Number(month.slice(0, 4)) <= 2100;
export function shiftMonth(month: string, amount: number) {
  if (!validMonth(month)) throw new Error("Invalid calendar month.");
  const [year, value] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, value - 1 + amount, 1)).toISOString().slice(0, 7);
  return validMonth(shifted) ? shifted : month;
}
export function calendarDays(month: string) {
  if (!validMonth(month)) throw new Error("Invalid calendar month.");
  const [year, value] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, value - 1, 1));
  const last = new Date(Date.UTC(year, value, 0));
  const count = Math.ceil((first.getUTCDay() + last.getUTCDate()) / 7) * 7;
  return Array.from({ length: count }, (_, index) => new Date(Date.UTC(year, value - 1, 1 - first.getUTCDay() + index)).toISOString().slice(0, 10));
}
