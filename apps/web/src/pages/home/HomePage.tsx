import { useState } from "react";
import { Link } from "@/shared/router-adapter";
import brandLogo from "../../../../shared/assets/brand/stanforte-logo.png";

type ModuleTab = "dashboard" | "payroll" | "finance" | "workflow" | "procurement" | "tasks";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ModuleTab>("dashboard");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-blue-600/20 via-indigo-500/20 to-teal-400/10 blur-[130px] rounded-full" />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] bg-indigo-600/10 blur-[140px] rounded-full" />
      </div>

      {/* Header Navigation */}
      <header className="relative z-50 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={brandLogo} alt="Stanforte Edge" className="h-9 w-auto object-contain brightness-110" />
            <span className="hidden sm:inline-block font-bold tracking-tight text-xl text-white font-headline">
              Stanforte<span className="text-blue-400">Edge</span> <span className="text-xs uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 ml-1">SaaS 2.0</span>
            </span>
          </Link>

                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link to="/features" className="hover:text-white transition-colors">Modules & Features</Link>
            <a href="#screens" className="hover:text-white transition-colors">Live Screenshots</a>
            <Link to="/pricing" className="hover:text-white transition-colors">Plans & Pricing</Link>
            <Link to="/security" className="hover:text-white transition-colors">Enterprise Security</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
            >
              Create Free Workspace
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-8">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Enterprise SaaS Cloud Operating System
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.12]">
          Unified People, Finance & Workflows in a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300">Single Multi-Tenant SaaS</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
          Transform your workforce with an all-in-one platform built for modern African and global enterprises. From self-service workspace provisioning and automated payroll runs to multi-tier approval workflows and financial ledgers.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/register"
            className="px-8 py-4 rounded-xl font-bold text-base bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
          >
            Start Free Workspace
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
          <a
            href="#screens"
            className="px-8 py-4 rounded-xl font-semibold text-base border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">visibility</span>
            Explore Converted Modules
          </a>
        </div>

        {/* Live Metrics Bar */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto border border-slate-800 bg-slate-800/40 backdrop-blur-md rounded-2xl p-6">
          <div>
            <div className="text-3xl font-extrabold text-white">100%</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Multi-Tenant Scoped</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-blue-400">14 Suites</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Integrated ERP Modules</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-indigo-400">Sub-10ms</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Fastify 5 API Latency</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-teal-400">199 Tests</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Automated QA Coverage</div>
          </div>
        </div>
      </section>

      {/* Interactive SaaS Screen Showcase (Live Screenshots) */}
      <section id="screens" className="relative z-10 py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">Live Application Previews</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">What Has Been Converted to SaaS</h2>
          <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
            Explore high-fidelity live snapshots of the modular suites powered by the Fastify API backend and multi-tenant data layer.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 border-b border-slate-800 pb-4">
          {[
            { id: "dashboard", label: "Executive Dashboard", icon: "dashboard" },
            { id: "payroll", label: "Automated Payroll", icon: "payments" },
            { id: "finance", label: "General Ledger", icon: "account_balance" },
            { id: "workflow", label: "Approval Workflows", icon: "account_tree" },
            { id: "procurement", label: "Procurement & B2B", icon: "shopping_cart" },
            { id: "tasks", label: "Sprint Kanban", icon: "view_kanban" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ModuleTab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Visual Mockup Container (Interactive Screenshot) */}
        <div className="border border-slate-800 rounded-3xl bg-slate-950/90 shadow-2xl overflow-hidden backdrop-blur-2xl">
          {/* Mock Browser Header */}
          <div className="h-11 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="text-xs text-slate-400 font-mono bg-slate-950 px-6 py-1 rounded-md border border-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-xs text-emerald-400">lock</span>
              https://app.stanforteedge.com/{activeTab === "dashboard" ? "" : activeTab}
            </div>
            <div className="text-xs text-slate-500 font-medium">Tenant ID: #TEN-0042</div>
          </div>

          {/* Screen Content */}
          <div className="p-6 sm:p-8 min-h-[500px]">
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {/* Stats row */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Active Workforce</div>
                    <div className="text-3xl font-extrabold text-white mt-2">142 Staff</div>
                    <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">trending_up</span> +8 this month
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Pending Approvals</div>
                    <div className="text-3xl font-extrabold text-amber-400 mt-2">7 Items</div>
                    <div className="text-xs text-slate-400 mt-1">Requires supervisor action</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Monthly Payroll Net</div>
                    <div className="text-3xl font-extrabold text-blue-400 mt-2">₦34.8M</div>
                    <div className="text-xs text-slate-400 mt-1">Batch #2026-11 Authorized</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Attendance Today</div>
                    <div className="text-3xl font-extrabold text-emerald-400 mt-2">96.4%</div>
                    <div className="text-xs text-slate-400 mt-1">128 On-Site (Geofenced)</div>
                  </div>
                </div>

                {/* Main preview body */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-white text-base">Recent Multi-Tenant Request Pipeline</h4>
                      <span className="text-xs text-blue-400 font-semibold cursor-pointer hover:underline">View All Requests</span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { id: "#REQ-1049", type: "Annual Leave (10 Days)", user: "Sarah Kalu", status: "Line Manager Approved", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
                        { id: "#REQ-1048", type: "Hardware Requisition", user: "David Momoh", status: "Finance Clearance Pending", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
                        { id: "#REQ-1047", type: "Staff Travel Advance", user: "Michael Adeleke", status: "Paid & Reconciled", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                      ].map((item) => (
                        <div key={item.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-sm text-white">{item.type}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{item.id} • Submitted by {item.user}</div>
                          </div>
                          <span className={`text-xs px-3 py-1 rounded-full border font-medium ${item.badge}`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                    <h4 className="font-bold text-white text-base mb-4">Live Geofenced Attendance</h4>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                          <span>HQ Victoria Island Office</span>
                          <span className="text-emerald-400">112 Clocked-In</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full w-[88%]" />
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                          <span>Abuja Regional Hub</span>
                          <span className="text-blue-400">16 Clocked-In</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full w-[100%]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "payroll" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Authorized & Stamped</span>
                    <h3 className="text-xl font-bold text-white mt-2">Payroll Run #2026-11 (Monthly Salary Batch)</h3>
                    <p className="text-xs text-slate-400 mt-1">Period: 01 Nov 2026 – 30 Nov 2026 • 142 Active Workers</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700">Export Bank CSV</button>
                    <button className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white">Batch Dispatch Payslips (BullMQ)</button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4">Designation</th>
                        <th className="py-3 px-4">Gross Salary</th>
                        <th className="py-3 px-4">PAYE Tax</th>
                        <th className="py-3 px-4">Pension (8%)</th>
                        <th className="py-3 px-4">Net Payable</th>
                        <th className="py-3 px-4">Payslip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {[
                        { name: "Michael Jenkins", role: "Principal Architect", gross: "₦1,850,000", paye: "₦295,000", pension: "₦148,000", net: "₦1,407,000" },
                        { name: "Amara Okonkwo", role: "Product Director", gross: "₦1,600,000", paye: "₦240,000", pension: "₦128,000", net: "₦1,232,000" },
                        { name: "Zainab Al-Hassan", role: "Chief Financial Officer", gross: "₦2,100,000", paye: "₦360,000", pension: "₦168,000", net: "₦1,572,000" },
                        { name: "Chinedu Eze", role: "Senior Frontend Lead", gross: "₦1,200,000", paye: "₦170,000", pension: "₦96,000", net: "₦934,000" },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-slate-800/40">
                          <td className="py-3.5 px-4 font-semibold text-white">{row.name}</td>
                          <td className="py-3.5 px-4 text-slate-400">{row.role}</td>
                          <td className="py-3.5 px-4 font-mono">{row.gross}</td>
                          <td className="py-3.5 px-4 font-mono text-red-400">{row.paye}</td>
                          <td className="py-3.5 px-4 font-mono text-amber-400">{row.pension}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">{row.net}</td>
                          <td className="py-3.5 px-4">
                            <span className="text-blue-400 hover:underline cursor-pointer flex items-center gap-1 font-semibold">
                              <span className="material-symbols-outlined text-sm">picture_as_pdf</span> PDF
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "finance" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Chart of Accounts</div>
                    <div className="text-2xl font-bold text-white mt-1">48 Active Ledgers</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Cleared Vouchers</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">₦184.2M Reconciled</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Unreconciled Items</div>
                    <div className="text-2xl font-bold text-blue-400 mt-1">0 Exceptions</div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                  <h4 className="font-bold text-white text-base mb-4">Real-Time Double-Entry General Ledger</h4>
                  <div className="space-y-3 font-mono text-xs">
                    {[
                      { ref: "JV-2026-904", desc: "Corporate Cloud Hosting Services (AWS S3 & Redis)", dr: "₦1,420,000", cr: "—", acc: "6010 - IT Infrastructure", date: "07 Nov" },
                      { ref: "JV-2026-903", desc: "Staff Training & Certifications Reimbursement", dr: "₦850,000", cr: "—", acc: "6040 - People Ops", date: "06 Nov" },
                      { ref: "JV-2026-902", desc: "Client Subscription Retainer (Q4 Renewal)", dr: "—", cr: "₦12,500,000", acc: "4010 - SaaS Revenue", date: "05 Nov" },
                    ].map((entry, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-slate-200 font-sans font-semibold">{entry.desc}</div>
                          <div className="text-slate-500 mt-0.5">{entry.ref} • {entry.acc} • {entry.date}</div>
                        </div>
                        <div className="text-right">
                          {entry.dr !== "—" ? (
                            <span className="text-amber-400 font-semibold">DR {entry.dr}</span>
                          ) : (
                            <span className="text-emerald-400 font-semibold">CR {entry.cr}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "workflow" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                  <h4 className="font-bold text-white text-base mb-2">Visual Approval Hierarchy Engine</h4>
                  <p className="text-xs text-slate-400 mb-6">Every tenant customizes approval thresholds, line supervisors, and financial clearances.</p>

                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-slate-950 border border-slate-800 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">1</div>
                      <div>
                        <div className="font-semibold text-sm text-white">Requester Submission</div>
                        <div className="text-xs text-slate-400">Employee attaches quotes & invoices</div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-600 hidden md:block">arrow_forward</span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">2</div>
                      <div>
                        <div className="font-semibold text-sm text-white">Line Supervisor Review</div>
                        <div className="text-xs text-slate-400">Operational justification check</div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-600 hidden md:block">arrow_forward</span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">3</div>
                      <div>
                        <div className="font-semibold text-sm text-white">Finance & Audit Clearance</div>
                        <div className="text-xs text-slate-400">Budget allocation & voucher coding</div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-600 hidden md:block">arrow_forward</span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">4</div>
                      <div>
                        <div className="font-semibold text-sm text-white">Disbursement & Archive</div>
                        <div className="text-xs text-slate-400">Automated payment & PDF generation</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "procurement" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-base">B2B Vendor Portal & Purchase Order Workflow</h4>
                    <p className="text-xs text-slate-400 mt-1">External vendors log into their secure portal to submit quotations and confirm deliveries.</p>
                  </div>
                  <Link to="/vendor-portal/login" className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700">
                    Vendor Portal Demo
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Requisitions in Progress</span>
                    <div className="text-2xl font-bold text-white mt-1">12 Purchase Requisitions</div>
                    <div className="mt-4 space-y-2 text-xs">
                      <div className="p-3 rounded-lg bg-slate-950 flex justify-between">
                        <span>PR-2026-081 • Datacenter Network Switches</span>
                        <span className="text-amber-400">3 Quotes Received</span>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-950 flex justify-between">
                        <span>PR-2026-080 • Ergonomic Workstations</span>
                        <span className="text-emerald-400">PO Dispatched</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Active Verified Vendors</span>
                    <div className="text-2xl font-bold text-white mt-1">34 Approved Suppliers</div>
                    <div className="mt-4 space-y-2 text-xs">
                      <div className="p-3 rounded-lg bg-slate-950 flex justify-between">
                        <span>Apex Cloud Solutions Ltd.</span>
                        <span className="text-emerald-400">Verified • Tier 1</span>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-950 flex justify-between">
                        <span>Sterling Office Supplies</span>
                        <span className="text-emerald-400">Verified • Tier 2</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-base">Agile Sprint 14 Kanban</h4>
                    <p className="text-xs text-slate-400">Real-time team project board with drag-and-drop workflow tracking.</p>
                  </div>
                  <span className="text-xs px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full font-semibold">
                    12 Days Remaining in Sprint
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center justify-between">
                      <span>To Do</span> <span className="bg-slate-800 px-2 py-0.5 rounded text-white">4</span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                        <div className="font-semibold text-white">Design Mobile Push Notification Templates</div>
                        <div className="text-slate-500 mt-2 flex justify-between">
                          <span>UI/UX</span> <span className="text-blue-400">3 Pts</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="text-xs font-bold text-amber-400 uppercase mb-3 flex items-center justify-between">
                      <span>In Progress</span> <span className="bg-amber-500/10 px-2 py-0.5 rounded text-amber-400 border border-amber-500/20">3</span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                        <div className="font-semibold text-white">Fastify 5 End-to-End API Consumption Tests</div>
                        <div className="text-slate-500 mt-2 flex justify-between">
                          <span>Backend</span> <span className="text-emerald-400">Done</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="text-xs font-bold text-emerald-400 uppercase mb-3 flex items-center justify-between">
                      <span>Done</span> <span className="bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-400 border border-emerald-500/20">8</span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                        <div className="font-semibold text-white">Redis Cache & Distributed Locks Integration</div>
                        <div className="text-slate-500 mt-2 flex justify-between">
                          <span>Core</span> <span className="text-emerald-400">Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section id="architecture" className="relative z-10 py-16 px-6 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center mb-12">
          <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">Engineered for Multi-Tenancy</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Modern Enterprise SaaS Foundation</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 rounded-3xl bg-slate-800/40 border border-slate-800 hover:border-blue-500/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-2xl">shield</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Row-Level Tenant Isolation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every database entity is permanently scoped with a tenant foreign key constraint. The context injector prevents cross-tenant leaks at compile and runtime.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-800/40 border border-slate-800 hover:border-indigo-500/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-2xl">bolt</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Fastify 5 & Redis Cache</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sub-10ms API responses powered by asynchronous Fastify 5 route plugins, connection pooling with Drizzle ORM, and shared Redis distributed locks.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-800/40 border border-slate-800 hover:border-teal-500/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-2xl">lock_person</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Bank-Grade RBAC</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Granular per-module permission bits, custom roles, wildcard administrator privileges, and audit logging tracking every write operation.
            </p>
          </div>
        </div>
      </section>

      {/* SaaS Pricing & Subscription Tiers */}
      <section id="pricing" className="relative z-10 py-16 px-6 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center mb-12">
          <div className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-2">Commercial SaaS Tiers</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Transparent Plans Built to Scale</h2>
          <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
            Choose the tier that matches your organization's growth. Upgrade or change your seat count anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Starter Plan */}
          <div className="p-8 rounded-3xl bg-slate-800/30 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Starter</div>
              <div className="text-4xl font-black text-white mt-2">Free <span className="text-sm text-slate-400 font-normal">/ forever</span></div>
              <p className="text-xs text-slate-400 mt-2">Essential workforce tools for small teams and startups.</p>

              <ul className="mt-6 space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span> Up to 15 Active Employees</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span> Core Attendance & Leave Tracking</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span> Standard Request Approvals</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span> 5 GB Secure S3 Cloud Storage</li>
              </ul>
            </div>
            <Link to="/register" className="mt-8 block text-center py-3 rounded-xl font-semibold text-xs border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white transition-all">
              Start Free
            </Link>
          </div>

          {/* Growth Plan */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-blue-900/40 via-slate-800/60 to-slate-900 border-2 border-blue-500/80 flex flex-col justify-between relative shadow-2xl shadow-blue-500/20">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold bg-blue-500 text-white uppercase tracking-wider">
              Most Popular
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-400">Growth / Business</div>
              <div className="text-4xl font-black text-white mt-2">$49 <span className="text-sm text-slate-400 font-normal">/ month</span></div>
              <p className="text-xs text-slate-300 mt-2">For growing companies requiring automated payroll & ledgers.</p>

              <ul className="mt-6 space-y-3 text-xs text-slate-200">
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span> Up to 100 Employees</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span> Automated Payroll & Tax Calculations</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span> Geofenced GPS Attendance & Locations</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span> Full General Ledger & Chart of Accounts</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span> 50 GB Secure S3 Storage</li>
              </ul>
            </div>
            <Link to="/register" className="mt-8 block text-center py-3 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all">
              Start Free 14-Day Trial
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="p-8 rounded-3xl bg-slate-800/30 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Enterprise</div>
              <div className="text-4xl font-black text-white mt-2">Custom <span className="text-sm text-slate-400 font-normal">/ quote</span></div>
              <p className="text-xs text-slate-400 mt-2">Full multi-org governance, vendor portal & dedicated cloud.</p>

              <ul className="mt-6 space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span> Unlimited Employees & Subsidiaries</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span> Procurement & B2B Vendor Portal</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span> Dedicated Redis Cluster & S3 Bucket</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span> Custom SLA & 24/7 Dedicated Support</li>
              </ul>
            </div>
            <Link to="/register" className="mt-8 block text-center py-3 rounded-xl font-semibold text-xs border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white transition-all">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 bg-slate-950/80 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt="Stanforte Edge" className="h-6 w-auto opacity-75" />
            <span>&copy; {new Date().getFullYear()} Stanforte Edge Limited. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-slate-300 transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-slate-300 transition-colors">Register</Link>
            <Link to="/features" className="hover:text-slate-300 transition-colors">Modules</Link>
            <Link to="/pricing" className="hover:text-slate-300 transition-colors">Pricing</Link>
            <Link to="/security" className="hover:text-slate-300 transition-colors">Security</Link>
            <a href="http://localhost:3000/v1/health/healthz" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              API Status
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

