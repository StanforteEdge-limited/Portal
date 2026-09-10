import { useMemo, useState } from "react";
import { Button, Icon, SectionCard } from "@/shared";
import { AccountShellPage } from "./page-helpers";

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<"general" | "finance">("general");

  const entries = useMemo(() => {
    if (activeTab === "finance") {
      return [
        {
          title: "Finance Requests",
          description:
            "Create, review, and track finance-related requests from submission to approval.",
          href: "/finance/requests",
          icon: "request_quote",
        },
        {
          title: "Payment Vouchers",
          description:
            "Review disbursement history, voucher status, and supporting records.",
          href: "/finance/payment-vouchers",
          icon: "receipt_long",
        },
        {
          title: "Finance Dashboard",
          description:
            "Monitor spend, approvals, and execution metrics in the finance module.",
          href: "/finance",
          icon: "analytics",
        },
      ];
    }

    return [
      {
        title: "Requests Help",
        description:
          "Understand request types, forms, attachments, and approval timelines.",
        href: "/requests",
        icon: "help_center",
      },
      {
        title: "Profile and Settings",
        description:
          "Manage your profile, password, notifications, and workspace preferences.",
        href: "/settings",
        icon: "manage_accounts",
      },
      {
        title: "Attendance and Leave",
        description:
          "Check attendance records and use leave self-service routes and workflows.",
        href: "/attendance",
        icon: "event_available",
      },
    ];
  }, [activeTab]);

  return (
    <AccountShellPage
      activeLabel=""
      breadcrumbs={[
        { label: "Workspace", path: "/profile" },
        { label: "Help" },
      ]}
      eyebrow="Workspace > Help"
      title="Help Center"
      description="Find support channels, quick guides, and operational help across the portal."
    >
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <SectionCard
            title="Popular Topics"
            description="Unified help center with dedicated Finance guidance."
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={activeTab === "general" ? "primary" : "secondary"}
                onClick={() => setActiveTab("general")}
              >
                General
              </Button>
              <Button
                size="sm"
                variant={activeTab === "finance" ? "primary" : "secondary"}
                onClick={() => setActiveTab("finance")}
              >
                Finance
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {entries.map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  className="rounded-[22px] border border-slate-100 bg-slate-50 p-5 transition hover:border-brand-900/30 hover:bg-white"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-900/10 text-brand-900">
                      <Icon name={item.icon} className="text-[20px]" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <SectionCard title="Need human support?">
            <p className="text-sm leading-6 text-slate-600">
              Use the help center for operational guidance. Each major workspace section can later link back here with contextual guides.
            </p>
            <Button className="mt-4 w-full justify-center">Contact Support</Button>
          </SectionCard>
        </div>
      </div>
    </AccountShellPage>
  );
}
