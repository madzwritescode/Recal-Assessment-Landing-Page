"use client";

import MaintenanceView from "./MaintenanceView";

export default function MaintenanceGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMaintenance =
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true" ||
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "1";

  if (isMaintenance) {
    return <MaintenanceView />;
  }

  return <>{children}</>;
}
