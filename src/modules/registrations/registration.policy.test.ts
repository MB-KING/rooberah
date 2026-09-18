import { describe, expect, it } from "vitest";
import { EventStatus, RegistrationStatus } from "@prisma/client";
import { AppError } from "@/shared/errors";
import { resolveRegistrationStatus } from "@/modules/registrations/registration.policy";

describe("resolveRegistrationStatus", () => {
  it("registers when event is published and has capacity", () => {
    expect(
      resolveRegistrationStatus({
        eventStatus: EventStatus.PUBLISHED,
        capacity: 10,
        registeredCount: 3
      })
    ).toBe(RegistrationStatus.REGISTERED);
  });

  it("registers without limit when capacity is unlimited", () => {
    expect(
      resolveRegistrationStatus({
        eventStatus: EventStatus.PUBLISHED,
        capacity: null,
        registeredCount: 240
      })
    ).toBe(RegistrationStatus.REGISTERED);
  });

  it("waitlists when capacity is full", () => {
    expect(
      resolveRegistrationStatus({
        eventStatus: EventStatus.PUBLISHED,
        capacity: 2,
        registeredCount: 2
      })
    ).toBe(RegistrationStatus.WAITLISTED);
  });

  it("rejects duplicate active registration", () => {
    expect(() =>
      resolveRegistrationStatus({
        eventStatus: EventStatus.PUBLISHED,
        registeredCount: 0,
        existingStatus: RegistrationStatus.REGISTERED
      })
    ).toThrow(AppError);
  });

  it("rejects when registration is closed by status", () => {
    expect(() =>
      resolveRegistrationStatus({
        eventStatus: EventStatus.REGISTRATION_CLOSED,
        registeredCount: 0
      })
    ).toThrow(AppError);
  });
});
