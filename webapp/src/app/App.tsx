import { RouterProvider } from "react-router";
import { useSessionQuery } from "@/api/session";
import { Providers } from "./providers";
import { router } from "./router";
import { Splash } from "./Splash";

function SessionGate() {
  const { isPending } = useSessionQuery();
  if (isPending) return <Splash />;
  return <RouterProvider router={router} />;
}

export function App() {
  return (
    <Providers>
      <SessionGate />
    </Providers>
  );
}
