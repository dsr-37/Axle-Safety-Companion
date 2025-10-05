export function checklistDateKeyForNow(date = new Date()) {
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const yyyy = shifted.getFullYear();
  const mm = String(shifted.getMonth() + 1).padStart(2, '0');
  const dd = String(shifted.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function msUntilNext0300(date = new Date()) {
  const now = new Date(date);
  // compute next day's 03:00 local time
  const target = new Date(now);
  target.setHours(3, 0, 0, 0);
  if (now >= target) {
    // already past today's 03:00 -> next day
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}
