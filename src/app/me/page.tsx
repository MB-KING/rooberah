import { redirect } from "next/navigation";

export default async function MePage({
  searchParams
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const { profile } = await searchParams;
  redirect(profile === "saved" ? "/?profile=saved" : "/");
}
