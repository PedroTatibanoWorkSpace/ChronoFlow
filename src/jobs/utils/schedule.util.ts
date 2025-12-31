import { BadRequestException } from '@nestjs/common';
import { CronExpression, parseExpression } from 'cron-parser';
import { DateTime } from 'luxon';

export interface ScheduleParseResult {
  cron: string;
  nextRunAt: Date | null;
  isRecurring: boolean;
}

export const computeNextRun = (cron: string, timezone: string): Date | null => {
  try {
    const now = DateTime.now().setZone(timezone) as unknown as DateTime;
    const interval = parseExpression(cron, {
      currentDate: now.toJSDate(),
      tz: timezone,
    }) as CronExpression;
    return interval.next().toDate();
  } catch {
    throw new BadRequestException(`Invalid cron expression: ${cron}`);
  }
};

export const parseSchedule = (
  input: string,
  timezone: string,
): ScheduleParseResult => {
  const normalized = normalizeText(input);

  const inMinutes = normalized.match(
    /^in\s+(\d+)\s*(min|mins|minute|minutes)$/i,
  );
  if (inMinutes) {
    const minutes = Number(inMinutes[1]);
    if (Number.isNaN(minutes) || minutes <= 0) {
      throw new BadRequestException(`Invalid interval: ${input}`);
    }
    const nextRunAt = DateTime.now()
      .setZone(timezone)
      .plus({ minutes })
      .toJSDate();
    return { cron: `in ${minutes} min`, nextRunAt, isRecurring: false };
  }

  const inHours = normalized.match(
    /^in\s+(\d+)\s*(h|hr|hrs|hour|hours|hora|horas)$/i,
  );
  if (inHours) {
    const hours = Number(inHours[1]);
    if (Number.isNaN(hours) || hours <= 0) {
      throw new BadRequestException(`Invalid interval: ${input}`);
    }
    const nextRunAt = DateTime.now()
      .setZone(timezone)
      .plus({ hours })
      .toJSDate();
    return { cron: `in ${hours} h`, nextRunAt, isRecurring: false };
  }

  const dailyAt = normalized.match(
    /^(every\s+day|daily|todo\s+dia|todos\s+os\s+dias)\s+(?:at\s+|as\s+)?(\d{1,2})(?::(\d{2}))?$/i,
  );
  if (dailyAt) {
    const hour = Number(dailyAt[2]);
    const minute = dailyAt[3] ? Number(dailyAt[3]) : 0;
    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      throw new BadRequestException(`Invalid daily time: ${input}`);
    }
    const cron = `${minute} ${hour} * * *`;
    const nextRunAt = computeNextRun(cron, timezone);
    return { cron, nextRunAt, isRecurring: true };
  }

  const cron = normalizeCron(input);
  const nextRunAt = computeNextRun(cron, timezone);
  return { cron, nextRunAt, isRecurring: true };
};

export const normalizeCron = (input: string): string => {
  const simplified = input.trim();
  const normalized = normalizeText(simplified);

  const everyMinutes = normalized.match(
    /^(\d+)\s*(min|mins|minute|minutes)$/i,
  );
  if (everyMinutes) {
    const minutes = Number(everyMinutes[1]);
    if (Number.isNaN(minutes) || minutes <= 0) {
      throw new BadRequestException(`Invalid interval: ${input}`);
    }
    return `*/${minutes} * * * *`;
  }

  const everyHours = normalized.match(
    /^(\d+)\s*(h|hr|hrs|hour|hours|hora|horas)$/i,
  );
  if (everyHours) {
    const hours = Number(everyHours[1]);
    if (Number.isNaN(hours) || hours <= 0) {
      throw new BadRequestException(`Invalid interval: ${input}`);
    }
    if (hours <= 23) {
      return `0 */${hours} * * *`;
    }
    if (hours % 24 === 0) {
      const days = hours / 24;
      return `0 0 */${days} * *`;
    }
    throw new BadRequestException(
      `Invalid hourly interval (use <=23h or multiples of 24h): ${input}`,
    );
  }

  return simplified;
};

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
