"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearTelegramSessionCookie,
  markLoggedOutCookie
} from "@/modules/auth/telegram-cookie";

export async function logoutAction() {
  const jar = await cookies();
  clearTelegramSessionCookie(jar);
  markLoggedOutCookie(jar);
  redirect("/");
}
