import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/shared";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import type { WorkItem } from "@stanforte/shared";
import DailyLogTab from "./DailyLogTab";
import MyTasksTab from "./MyTasksTab";

type Tab = "tasks" | "log";

export default function TasksPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [logTaskId, setLogTaskId] = useState<string | undefined>();

  const tab = (searchParams.get("tab") as Tab | null) ?? "tasks";

  const setTab = (nextTab: Tab) => setSearchParams({ tab: nextTab }, { replace: true });

  const handleLogToday = (item: WorkItem) => {
    setLogTaskId(item.id);
    setTab("log");
  };

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Staff";

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="my-tasks"
      user={{
        name: userName,
        role: "Staff",
      }}
      mobileNav={buildAppMobileNav("Tasks")}
    >
      <PageHeader title="My Tasks" />

      <div className="flex gap-2 border-b border-gray-200 mb-6">
        {(["tasks", "log"] as Tab[]).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            className={[
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === tabKey
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700",
            ].join(" ")}
            onClick={() => setTab(tabKey)}
          >
            {tabKey === "tasks" ? "My Tasks" : "Daily Log"}
          </button>
        ))}
      </div>

      {tab === "tasks" && <MyTasksTab onLogToday={handleLogToday} />}

      {tab === "log" && (
        <DailyLogTab
          preselectedTaskId={logTaskId}
          onPreselectedConsumed={() => setLogTaskId(undefined)}
        />
      )}
    </AppShell>
  );
}
