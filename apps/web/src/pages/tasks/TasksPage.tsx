import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import type { WorkItem } from "@stanforte/shared";
import DailyLogTab from "./DailyLogTab";
import MyTasksTab from "./MyTasksTab";
import {
  CheckSquare,
  BookOpen,
  ChevronRight,
  Clock,
  ListTodo,
} from "lucide-react";

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

  return (
    <PortalLayout activeNav="Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Link to="/dashboard" className="hover:text-slate-800 transition">Dashboard</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-800 font-semibold">Tasks & Logs</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
              Work Items & Daily Standup
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Organize daily deliverables, log working hours against active sprints, and track personal work items.
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setTab("tasks")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              tab === "tasks"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <CheckSquare className={`h-4 w-4 ${tab === "tasks" ? "text-[#ff6900]" : "text-slate-400"}`} />
            <span>My Tasks</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("log")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              tab === "log"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Clock className={`h-4 w-4 ${tab === "log" ? "text-[#ff6900]" : "text-slate-400"}`} />
            <span>Daily Log & Standup</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-w-0">
          {tab === "tasks" && <MyTasksTab onLogToday={handleLogToday} />}
          {tab === "log" && (
            <DailyLogTab
              preselectedTaskId={logTaskId}
              onPreselectedConsumed={() => setLogTaskId(undefined)}
            />
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
