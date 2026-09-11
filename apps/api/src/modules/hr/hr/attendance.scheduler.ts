import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { NotificationsService } from '$modules/notifications/notifications.service';

@Injectable()
export class AttendanceScheduler {
  private readonly logger = new Logger(AttendanceScheduler.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly tenantContext: TenantContextService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async remindOpenSessions() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (currentMinutes < 16 * 60 || currentMinutes > 23 * 60) {
      return;
    }

    await this.tenantContext.runSystem('attendance clock-out reminder', async () => {
      const todayKey = now.toISOString().slice(0, 10);

      const entries = await this.drizzle.attendanceEntry.findMany({
        where: {
          workDate: new Date(todayKey),
          entryAt: { lte: now },
        },
        orderBy: { entryAt: 'asc' },
      });

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
        const profiles = await this.drizzle.profile.findMany({
          where: { id: { in: batch } },
          select: { id: true, firstName: true, lastName: true, email: true, username: true },
        });

        for (const profile of profiles) {
          const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username || 'there';
          try {
            await this.notifications.create({
              userId: profile.id,
              title: 'Clock Out Reminder',
              message:
                `Hi ${displayName}, you have an open attendance session and have not clocked out yet. ` +
                `Please remember to clock out before leaving for the day.`,
              link: '/attendance',
              sentVia: ['in-app', 'email'],
              emailSubject: 'Reminder: Clock out your attendance session',
              emailHtml: undefined,
              notifiableType: 'attendance_reminder',
            });
            this.logger.log(`Sent clock-out reminder to user ${profile.id}`);
          } catch (error) {
            this.logger.warn(
              `Failed to enqueue clock-out reminder for user ${profile.id}: ${error instanceof Error ? error.message : 'unknown error'}`
            );
          }
        }
      }
    });
  }
}