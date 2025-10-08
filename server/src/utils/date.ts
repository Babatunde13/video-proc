import { addHours } from "date-fns";

export const addHoursToDate = (hour: number, date?: Date) => {
  return addHours(date || new Date(), hour);
};
