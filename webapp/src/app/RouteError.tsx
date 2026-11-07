import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router";
import { Compass } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { Logo } from "@/components/brand/Logo";

export function RouteError() {
  const t = useT();
  const error = useRouteError();
  const navigate = useNavigate();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const chunkFailed = error instanceof Error && /dynamically imported module|Failed to fetch/i.test(error.message);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6">
      <Logo size={44} />
      <EmptyState
        icon={<Compass className="size-6" />}
        title={notFound ? t.common.notFound : t.common.errorTitle}
        body={notFound ? undefined : t.common.errorBody}
        action={
          <div className="flex gap-2">
            {chunkFailed && (
              <Button variant="primary" onClick={() => window.location.reload()}>
                {t.common.retry}
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate("/", { replace: true })}>
              {t.tabs.home}
            </Button>
          </div>
        }
      />
    </div>
  );
}
