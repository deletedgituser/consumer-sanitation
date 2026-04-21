"use client";

import { useRouter } from "next/navigation";
import OverviewReport from "./OverviewReport";

export default function OverviewReportPage() {
  const router = useRouter();
  return <OverviewReport onBack={() => router.back()} />;
}
