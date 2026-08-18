Here's the complete payroll run testing guide:
----------------------------------------------

# Payroll Run — End-to-End Testing Guide
## Prerequisites
Ensure your test user has the right permissions/roles assigned:

- HR: must have payroll.manage
- Finance: must have payroll.approve + finance.view
- COO/ED (Admin): must have payroll.authorize
- Also ensure at least 1 organization exists with staff assigned to it

---

## Step 0 — HR: Add Payroll Workers

> Workers are **not** synced automatically from employees. HR must add them manually before creating a run.

1. Log in as HR user
2. Navigate to HR → Payroll → Workers
3. Click "Add Worker"
4. **Search for an existing employee** to auto-fill name/email/staff code, or enter them manually
5. Fill in the required fields:
   - Worker type: *employee* or *consultant*
   - Pay basis: *monthly_fixed*, *hourly_timesheet*, *daily_rate*, *retainer*, or *manual*
   - Bank details, tax ID, pension ID
   - Start date (when they become active for payroll)
6. Click "Add Worker"
7. Repeat for each worker you want on payroll
8. To set pay amounts: edit the worker and add **pay profiles** under their profile tab (effective-dated salary components and amounts)

**Bulk import:** You can also upload a CSV via the Import option under Payroll.

---

## Step 1 — HR: Create & Prepare a Run

1. Log in as HR user
2. Navigate to HR → Payroll → Payroll Runs
3. Click "New Payroll Run"
4. Fill in: Organization, Currency, Year, Month, Notes
5. Click "Create Run"
6. You're taken to the run detail page — status is draft
7. Click "Generate Items" — this creates pay items for **all active workers** whose date range overlaps with this run's period
   - Status changes to `prepared`
8. Review the generated items if needed
9. Click "Submit to Finance"
   - Status changes to `under_review`
     You can also Delete a run while it's still in draft/prepared status.

---

## Step 2 — Finance: Review & Approve

1. Log in as Finance user
2. Navigate to Finance → Payroll
3. The run should appear under "Pending Review"
4. Click "Review" to open the run detail
5. Review the payroll items
6. Click "Mark Reviewed" (optional, keeps the run in `under_review` while recording the review action)
7. Click "Approve" to approve the run
   - Status changes to approved
8. An amber banner appears: "Awaiting ED/COO Authorization"
   Optional: Finance can click "Reject" to send the run back. If rejected:
   - HR can Reopen (draft), fix items, regenerate, and resubmit

---

## Step 3 — COO/ED (Admin): Authorize

1. Log in as COO or ED user
2. Navigate to Administration → Payroll Authorization
3. The run appears under "Pending Authorization"
4. Click "Review & Authorize"
5. Review the run details and breakdown
6. Click "Authorize Payment"
   - Status changes to authorized
7. A green chip appears: "Authorized — Finance can proceed with payment"
   Only users with the payroll.authorize permission can do this step. Finance cannot self-authorize.

---

## Step 4 — Finance: Pay & Close

1. Log in again as Finance user
2. Navigate to Finance → Payroll → run detail
3. A green banner appears: "Authorized for Payment"
4. Click "Mark as Paid"
   - Status passes through payment_processing → becomes paid
   - Journal entries and loan repayments are created internally
5. Optionally distribute payslips (PDF email to workers) or download bank schedule CSV
6. Click "Close Run"
   - Status changes to closed — final state

---

## Step 5 — Staff: View Payslip (optional)

1. Log in as a staff member assigned to the org
2. Navigate to Profile → Payslips
3. View/download the generated payslip for the run

---

# Status Transition Diagram
HR                  Finance             COO/ED             Finance
──                  ───────             ──────             ───────
draft ──→ prepared ──→ under_review ──→ approved ──→ authorized ──→ paid ──→ closed
       ↑                  │                                  ↑
       └── rejected ←─────┘                                  │
       (HR reopens)                                    (only payroll.authorize)

## Permission per action:
| Action | Permission | Who |
|--------|-----------|-----|
| Create/Generate/Submit/Delete/Reopen run | `payroll.manage` | HR |
| Manage workers | `payroll.manage` | HR |
| Review/Approve/Reject/Pay/Close run | `payroll.approve` | Finance |
| Manage setup (components, tax tables, settings, loans, import) | `finance.manage` | Finance |
| View dashboard/inbox/reports/workers | `finance.view` | Finance |
| Authorize payment | `payroll.authorize` | COO/ED |
| View/download own payslips | _(none — user context)_ | Staff |

# Things to watch for while testing

1. Org isolation — Does Finance see runs from Org A when looking at Org B's data?
2. Status filtering — HR sees only `draft`, `prepared`, `rejected`. Finance sees `under_review` and `approved` runs, then returns to handle `authorized` runs for payment. Verify the correct runs appear.
3. Authorization gate — Can Finance authorize without payroll.authorize? (Should fail with 403)
4. Delete guard — Can HR delete an approved run? (Should fail — only draft/prepared)
5. Worker scope — Generate Items should only pull workers belonging to the run's organization
