import { createHashRouter } from "react-router";
import { Layout } from "./Layout";
import { RouteError } from "./RouteError";
import { Splash } from "./Splash";

export const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <Splash />,
    children: [
      { index: true, lazy: () => import("@/features/home/HomePage").then((m) => ({ Component: m.HomePage })) },
      { path: "search", lazy: () => import("@/features/search/SearchPage").then((m) => ({ Component: m.SearchPage })) },
      { path: "schedule", lazy: () => import("@/features/schedule/SchedulePage").then((m) => ({ Component: m.SchedulePage })) },
      { path: "library", lazy: () => import("@/features/library/LibraryPage").then((m) => ({ Component: m.LibraryPage })) },
      { path: "media/:id", lazy: () => import("@/features/media/MediaPage").then((m) => ({ Component: m.MediaPage })) },
      { path: "character/:id", lazy: () => import("@/features/people/CharacterPage").then((m) => ({ Component: m.CharacterPage })) },
      { path: "staff/:id", lazy: () => import("@/features/people/StaffPage").then((m) => ({ Component: m.StaffPage })) },
      { path: "user/:name", lazy: () => import("@/features/profile/ProfilePage").then((m) => ({ Component: m.UserProfilePage })) },
      { path: "me", lazy: () => import("@/features/profile/ProfilePage").then((m) => ({ Component: m.MyProfilePage })) },
      {
        path: "notifications",
        lazy: () => import("@/features/notifications/NotificationsPage").then((m) => ({ Component: m.NotificationsPage })),
      },
      { path: "settings", lazy: () => import("@/features/settings/SettingsPage").then((m) => ({ Component: m.SettingsPage })) },
      { path: "*", lazy: () => import("@/features/NotFoundPage").then((m) => ({ Component: m.NotFoundPage })) },
    ],
  },
]);
