import { EventStatus } from "@prisma/client";
import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  eventNumber: z.number().int().positive(),
  date: z.coerce.date(),
  meetingTime: z.coerce.date(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  registrationDeadline: z.coerce.date().optional(),
  checkInStartsAt: z.coerce.date().optional(),
  checkInEndsAt: z.coerce.date().optional(),
  locationName: z.string().min(2),
  locationAddress: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  capacity: z.number().int().positive().optional().nullable(),
  status: z.nativeEnum(EventStatus).default(EventStatus.DRAFT)
});

export const eventFilterSchema = z.object({
  status: z.nativeEnum(EventStatus).optional()
});
