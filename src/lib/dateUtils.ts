// Date helpers
export const parseDate = (dateStr: string): Date => {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
};

export const parseLookaheadDate = (dateStr: string): Date => {
    const d = new Date(dateStr);
    return new Date(d.valueOf() + d.getTimezoneOffset() * 60 * 1000);
};

export const getDaysDiff = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const formatDateForInput = (dateStr: string): string => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return '';
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month}-${day}`;
};

export const formatDateFromInput = (dateStr: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export const formatDateISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
