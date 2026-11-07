import type { ReactNode } from "react";
import { ChevronRight, Code2, ExternalLink, LogOut, MessageCircle } from "lucide-react";
import { useLogout } from "@/api/auth";
import { useSession, useUpdateSettings } from "@/api/session";
import type { Lang, NotificationSettings } from "@/api/types";
import { useI18n } from "@/lib/i18n";
import { confirmAction, haptic, openExternal, openTelegram } from "@/lib/telegram";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoginGate } from "@/components/auth/LoginGate";
import { Logo } from "@/components/brand/Logo";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import { Image } from "@/components/ui/Image";

const NOTIFICATION_KEYS: (keyof NotificationSettings)[] = [
  "airing_watching",
  "airing_planning",
  "airing_paused",
  "airing_dropped",
  "related",
  "anilist_activity",
];

const REPO_URL = "https://github.com/Westyasha/AniList_Telegram";

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 px-4">
      <div className="px-1">
        <h2 className="text-xs font-bold text-muted">{title}</h2>
        {hint && <p className="mt-0.5 text-[11.5px] text-faint">{hint}</p>}
      </div>
      <div className="rounded-2xl border border-line bg-surface px-4">{children}</div>
    </section>
  );
}

function RowButton({ icon, label, value, onClick, tone = "default" }: { icon: ReactNode; label: string; value?: string; onClick: () => void; tone?: "default" | "danger" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 w-full items-center gap-3 border-b border-line text-left last:border-0 ${tone === "danger" ? "text-dropped" : "text-fg"}`}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted">{icon}</span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      {value && <span className="text-xs font-semibold text-faint">{value}</span>}
      <ChevronRight className="size-4 text-faint" />
    </button>
  );
}

export function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const session = useSession();
  const update = useUpdateSettings();
  const logout = useLogout();
  const notifications = session.notifications;
  const anilist = session.anilist;

  const toggle = (key: keyof NotificationSettings, value: boolean) => update.mutate({ notifications: { [key]: value } });

  const onLogout = async () => {
    if (!(await confirmAction(t.settings.logoutConfirm))) return;
    logout.mutate(undefined, {
      onSuccess: () => {
        haptic.notify("success");
        toast.info(t.settings.loggedOut);
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.settings.title} />

      {session.offline && <p className="mx-4 rounded-xl border border-line bg-surface-2 px-4 py-3 text-xs text-muted">{t.settings.guestNotice}</p>}

      <Group title={t.settings.account}>
        {anilist ? (
          <>
            <div className="flex items-center gap-3 border-b border-line py-3.5">
              <Image src={anilist.avatar} alt="" className="size-12 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold">{anilist.name}</p>
                {session.user?.username && <p className="truncate text-xs text-faint">@{session.user.username}</p>}
              </div>
            </div>
            <RowButton
              icon={<ExternalLink className="size-4" />}
              label={t.settings.openProfile}
              onClick={() => openExternal(`https://anilist.co/user/${encodeURIComponent(anilist.name)}`)}
            />
            <RowButton icon={<LogOut className="size-4" />} label={t.settings.logout} tone="danger" onClick={() => void onLogout()} />
          </>
        ) : (
          <LoginGate compact className="py-4" />
        )}
      </Group>

      <Group title={t.settings.language} hint={t.settings.languageHint}>
        <div className="py-3">
          <Segmented<Lang>
            value={lang}
            onChange={setLang}
            label={t.settings.language}
            options={[
              { value: "ru", label: "Русский" },
              { value: "en", label: "English" },
            ]}
          />
        </div>
      </Group>

      <Group title={t.settings.notifications} hint={t.settings.notificationsHint}>
        <div className="divide-y divide-line">
          <Switch
            checked={notifications.enabled}
            onChange={(value) => toggle("enabled", value)}
            label={t.settings.notificationLabels.enabled}
            disabled={session.offline}
          />
          {NOTIFICATION_KEYS.map((key) => (
            <Switch
              key={key}
              checked={notifications[key]}
              onChange={(value) => toggle(key, value)}
              label={t.settings.notificationLabels[key]}
              disabled={session.offline || !notifications.enabled}
            />
          ))}
        </div>
      </Group>

      <Group title={t.settings.about}>
        <div className="flex items-center gap-3 border-b border-line py-4">
          <Logo size={40} />
          <div>
            <p className="text-sm font-bold">AniList for Telegram</p>
            <p className="tabular text-xs text-faint">
              {t.settings.version} {__APP_VERSION__}
            </p>
          </div>
        </div>
        {session.bot_username && (
          <RowButton
            icon={<MessageCircle className="size-4" />}
            label={t.settings.bot}
            value={`@${session.bot_username}`}
            onClick={() => openTelegram(`https://t.me/${session.bot_username}`)}
          />
        )}
        <RowButton icon={<Code2 className="size-4" />} label={t.settings.source} value="GitHub" onClick={() => openExternal(REPO_URL)} />
      </Group>
    </div>
  );
}
