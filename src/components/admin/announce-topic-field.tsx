import { TelegramResourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function AnnounceTopicField({
  communityId,
  defaultThreadId
}: {
  communityId: string;
  defaultThreadId?: number | null;
}) {
  const topics = await prisma.telegramForumTopic.findMany({
    where: {
      resource: {
        communityId,
        isActive: true,
        type: TelegramResourceType.GROUP
      }
    },
    include: { resource: { select: { name: true } } },
    orderBy: [{ resource: { name: "asc" } }, { title: "asc" }]
  });

  if (topics.length === 0) return null;

  return (
    <label className="grid gap-2 text-sm font-bold text-slate-200">
      تاپیک اطلاع‌رسانی گروه
      <select
        name="announceThreadId"
        defaultValue={defaultThreadId != null ? String(defaultThreadId) : ""}
        className="h-11 rounded-xl border border-white/10 bg-[#1C1008] px-3 text-white outline-none focus:border-[#F39C12]"
      >
        <option value="">تاپیک پیش‌فرض گروه</option>
        {topics.map((topic) => (
          <option key={topic.id} value={topic.threadId}>
            {topic.resource.name} — {topic.title}
          </option>
        ))}
      </select>
      <span className="text-xs font-medium leading-6 text-slate-400">
        پیاده‌روی یا برنامه‌های آزاد. کانال تاپیک ندارد و همان متن را بدون
        تاپیک می‌گیرد.
      </span>
    </label>
  );
}
