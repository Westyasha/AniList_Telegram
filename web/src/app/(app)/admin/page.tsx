import type { Metadata } from "next";
import { AdminScreen } from "@/features/admin/AdminScreen";

export const metadata: Metadata = { title: "Admin" };

export default function Page() {
  return <AdminScreen />;
}
