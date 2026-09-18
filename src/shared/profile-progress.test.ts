import { describe, expect, it } from "vitest";
import { getProfileProgress } from "@/shared/profile-progress";

describe("getProfileProgress", () => {
  it("starts empty", () => {
    const progress = getProfileProgress({});
    expect(progress.doneCount).toBe(0);
    expect(progress.percent).toBe(0);
    expect(progress.complete).toBe(false);
    expect(progress.missing.map((step) => step.key)).toContain("firstName");
  });

  it("counts filled identity and profile fields", () => {
    const progress = getProfileProgress({
      firstName: "سارا",
      lastName: "محمدی",
      workCategoryId: "cat-1",
      profile: {
        phoneNumber: "09121234567",
        birthDate: "1995-01-01",
        bio: "طراح",
        businessName: "استودیو",
        workStatus: "FREELANCE",
        skills: "طراحی",
        socialLinks: { website: "https://example.ir" }
      }
    });
    expect(progress.doneCount).toBe(progress.total);
    expect(progress.percent).toBe(100);
    expect(progress.complete).toBe(true);
  });

  it("treats social as one step when any link exists", () => {
    const progress = getProfileProgress({
      profile: { socialLinks: { linkedin: "linkedin.com/in/sara" } }
    });
    expect(progress.steps.find((step) => step.key === "social")?.done).toBe(
      true
    );
  });
});
