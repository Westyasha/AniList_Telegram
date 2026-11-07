"use client";

import type { ReactNode } from "react";
import { Check, ChevronRight, ExternalLink } from "lucide-react";
import { useLogout } from "@/api/auth";
import { useSession, useUpdateSettings } from "@/api/session";
import type { Lang, NotificationSettings } from "@/api/types";
import { useI18n } from "@/lib/i18n";
import { confirmAction, haptic, openExternal, openTelegram } from "@/lib/telegram";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/shell/PageHeader";
import { LoginGate } from "@/components/shell/LoginGate";
import { Avatar } from "@/components/media/Poster";
import { Mark } from "@/components/brand/Mark";
import { Icon } from "@/components/ui/Icon";
import { Switch } from "@/components/ui/Switch";
import { Figures } from "@/components/ui/Figures";

const NOTIFICATION_KEYS: (keyof NotificationSettings)[] = ["airing_watching", "airing_planning", "airing_paused", "airing_dropped", "related", "anilist_activity"];

const REPO_URL = "https://github.com/Westyasha/AniList_Telegram";

const LANGUAGES: { value: Lang; label: string }[] = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
];

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 px-4">
      <div>
        <h2 className="text-17 font-semibold text-fg">{title}</h2>
        {hint ? <p className="text-13 text-fg3">{hint}</p> : null}
      </div>
      <div className="border-t border-line [&>*]:border-b [&>*]:border-line">{children}</div>
    </section>
  );
}

function Row({ label, value, onClick, danger = false, external = false }: { label: string; value?: string; onClick: () => void; danger?: boolean; external?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex h-12 w-full items-center gap-3 text-left transition-colors", danger ? "text-score-low" : "text-fg hover:text-fg2")}>
      <span className="flex-1 text-15">{label}</span>
      {value ? <span className="text-13 text-fg3">{value}</span> : null}
      {danger ? null : <Icon icon={external ? ExternalLink : ChevronRight} className="text-fg3" />}
    </button>
  );
}

export function SettingsScreen() {
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
    <div className="flex flex-col gap-8">
      <PageHeader title={t.settings.title} />

      {session.offline ? <p className="-mt-4 px-4 text-13 text-fg3">{t.settings.guestNotice}</p> : null}

      <Group title={t.settings.account}>
        {anilist ? (
          <>
            <div className="flex h-16 items-center gap-3">
              <Avatar src={anilist.avatar} alt="" size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-15 font-medium text-fg">{anilist.name}</p>
                {session.user?.username ? <p className="truncate text-13 text-fg3">@{session.user.username}</p> : null}
              </div>
            </div>
            <Row label={t.settings.openProfile} external onClick={() => openExternal(`https://anilist.co/user/${encodeURIComponent(anilist.name)}`)} />
            <Row label={t.settings.logout} danger onClick={() => void onLogout()} />
          </>
        ) : (
          <LoginGate compact className="border-b-0" />
        )}
      </Group>

      <Group title={t.settings.language} hint={t.settings.languageHint}>
        {LANGUAGES.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={lang === option.value}
            onClick={() => {
              if (lang === option.value) return;
              haptic.selection();
              setLang(option.value);
            }}
            className="flex h-12 w-full items-center gap-3 text-left"
          >
            <span className={cn("flex-1 text-15", lang === option.value ? "text-fg" : "text-fg2")}>{option.label}</span>
            {lang === option.value ? <Icon icon={Check} className="text-fg" /> : null}
          </button>
        ))}
      </Group>

      <Group title={t.settings.notifications} hint={t.settings.notificationsHint}>
        <Switch checked={notifications.enabled} onChange={(value) => toggle("enabled", value)} label={t.settings.notificationLabels.enabled} disabled={session.offline} />
        {NOTIFICATION_KEYS.map((key) => (
          <Switch
            key={key}
            checked={notifications[key]}
            onChange={(value) => toggle(key, value)}
            label={t.settings.notificationLabels[key]}
            disabled={session.offline || !notifications.enabled}
          />
        ))}
      </Group>

      <Group title={t.settings.about}>
        <div className="flex h-16 items-center gap-3">
          <Mark size={32} />
          <div>
            <p className="text-15 font-medium text-fg">AniList for Telegram</p>
            <Figures text={`${t.settings.version} ${process.env.NEXT_PUBLIC_APP_VERSION ?? ""}`} className="block text-13 text-fg3" />
          </div>
        </div>
        {session.bot_username ? <Row label={t.settings.bot} value={`@${session.bot_username}`} external onClick={() => openTelegram(`https://t.me/${session.bot_username}`)} /> : null}
        <Row label={t.settings.source} value="GitHub" external onClick={() => openExternal(REPO_URL)} />
      </Group>
    </div>
  );
}
