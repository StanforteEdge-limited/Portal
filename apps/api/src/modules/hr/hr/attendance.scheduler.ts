import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { DistributedLockService } from '$common/locks/distributed-lock.service';
import { DbService } from '$common/db/db.service';
import { NotificationsService } from '$modules/notifications/notifications.service';
import { profile } from '$modules/identity/users/model';
import { notification } from '$modules/notifications/model';
import { AttendanceService } from './attendance.service';
import { attendanceEntry } from './model';

const CLOCK_OUT_REMINDER_MINUTES = 30;

@Injectable()
export class AttendanceScheduler {
  private readonly logger = new Logger(AttendanceScheduler.name);

  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
    private readonly notifications: NotificationsService,
    private readonly attendance: AttendanceService,
    private readonly locks: DistributedLockService,
  ) {}

  @Cron('0 */15 * * * *')
  async remindOpenSessions() {
    await this.locks.withLock('attendance-reminder', 1_800_000, async () => {
      await this.runReminderSweep();
    });
  }

  private async runReminderSweep() {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const workDate = new Date(todayKey);

    await this.tenantContext.runSystem('attendance clock-out reminder', async () => {
      const entries = await this.db.client
        .select()
        .from(attendanceEntry)
        .where(and(eq(attendanceEntry.workDate, workDate), lte(attendanceEntry.entryAt, now)))
        .orderBy(asc(attendanceEntry.entryAt));

      if (!entries.length) return;

      const grouped = new Map<string, Array<{ entryType: string; entryAt: Date }>>();
      for (const entry of entries) {
        const key = entry.userId.toString();
        const list = grouped.get(key) ?? [];
        list.push({ entryType: entry.entryType, entryAt: entry.entryAt });
        grouped.set(key, list);
      }

      const openUserIds = Array.from(grouped.entries())
        .filter(([, list]) => {
          let open = false;
          for (const entry of list) {
            if (entry.entryType === 'clock_in') open = true;
            if (entry.entryType === 'clock_out') open = false;
          }
          return open;
        })
        .map(([key]) => key);

      if (!openUserIds.length) return;

      const batchSize = 50;
      for (let i = 0; i < openUserIds.length; i += batchSize) {
        const batch = openUserIds.slice(i, i + batchSize).map((key) => BigInt(key));
        const profiles = await this.db.client
          .select({
            id: profile.id,
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            username: profile.username,
          })
          .from(profile)
          .where(inArray(profile.id, batch));

        for (const profile of profiles) {
          try {
            const endTime = await this.attendance.getClockOutTime(profile.id, workDate);
            if (!endTime) continue;

            const reminderAt = new Date(
              endTime.getTime() - CLOCK_OUT_REMINDER_MINUTES * 60000
            );

            const [existing] = await this.db.client
              .select({ id: notification.id })
              .from(notification)
              .where(and(
                eq(notification.userId, profile.id),
                eq(notification.notifiableType, 'attendance_reminder'),
                gte(notification.createdAt, new Date(todayKey)),
              ))
              .limit(1);
            if (existing) continue;

            const displayName =
              [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
              profile.username ||
              'there';
            const endLabel = this.formatTime(endTime);

            await this.notifications.create({
              userId: profile.id,
              title: 'Clock Out Reminder',
              message:
                `Hi ${displayName}, your work day ends at ${endLabel}. ` +
                `Please remember to clock out before leaving.`,
              link: '/attendance',
              sentVia: ['in-app', 'email'],
              emailSubject: 'Reminder: Clock out your attendance session',
              emailHtml: undefined,
              notifiableType: 'attendance_reminder',
              notifiableId: profile.id,
              data: { work_date: todayKey },
              scheduledFor: reminderAt,
            });
            this.logger.log(
              `Scheduled clock-out reminder for user ${profile.id} at ${reminderAt.toISOString()}`
            );
          } catch (error) {
            this.logger.warn(
              `Failed to schedule clock-out reminder for user ${profile.id}: ${
                error instanceof Error ? error.message : 'unknown error'
              }`
            );
          }
        }
      }
    });
  }

  private formatTime(date: Date) {
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}
