import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center px-4 text-slate-100">
      <div className="rounded-xl border border-white/10 bg-pine p-5 text-center">
        <h1 className="text-xl font-black text-white">این صفحه پیدا نشد</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          این مسیر وجود ندارد. از خانه ادامه بده.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-ember px-4 text-sm font-black text-ink transition duration-200 active:scale-[0.99] hover:bg-gold"
        >
          بازگشت به خانه
        </Link>
      </div>
    </main>
  );
}
