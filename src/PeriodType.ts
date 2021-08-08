import { Enum } from '@diff./enum';
import moment from 'moment';

export interface PeriodCondition {
  period: number;
  startAt: number;
  endAt: number;
}

export class PeriodType extends Enum {
  static readonly HOURLY = new PeriodType(1, 'hourly');
  static readonly DAILY = new PeriodType(2, 'daily');
  static readonly WEEKLY = new PeriodType(3, 'weekly');
  static readonly MONTHLY = new PeriodType(4, 'monthly');
  static readonly QUARTERLY = new PeriodType(5, 'quarterly');
  static readonly YEARLY = new PeriodType(6, 'yearly');

  static readonly TOTAL = new PeriodType(11, 'total');
  static readonly RECENTLY = new PeriodType(10, 'recently'); // 최근 24시간

  get interval(): string {
    switch (this) {
      case PeriodType.HOURLY:
        return '1h';
      case PeriodType.DAILY:
        return '1d';
      case PeriodType.WEEKLY:
        return '1w';
      case PeriodType.MONTHLY:
        return '1M';
      case PeriodType.QUARTERLY:
        return '1q';
      case PeriodType.YEARLY:
        return '1y';
      default:
        throw new RangeError('interval 을 지정할 수 없는 타입입니다.');
    }
  }

  get intervalSecond(): number {
    switch (this) {
      case PeriodType.HOURLY:
        return 3600;
      case PeriodType.DAILY:
        return 86400;
      case PeriodType.WEEKLY:
        return 592200;
      case PeriodType.MONTHLY:
        return 2592000;
      case PeriodType.QUARTERLY:
        return 7776000;
      case PeriodType.YEARLY:
        return 31536000;
      default:
        throw new RangeError('interval를 초단위로 표현할 수 없는 타입니다.');
    }
  }

  // period 는 차트 집계 시작 시점으로 지정됨.
  // 단 상대적 범위인 RECENT는 targetTimestamp가 포함된 시간의 정각으로 지정
  // tagetTimestamp 가 포함된 시간대를 포함한 범위를 리턴
  // 한국 시간이 아닌 GMT+0 임에 유의
  condition(targetTimestamp: number): { period: number; startAt: number; endAt: number } {
    let period = 0;
    let startAt = 0;
    let endAt = 0;

    // TODO : 임시대응, 이후 데이터 마이그레이션 필요
    // GMT +9 -> GMT +0 변경 시점 : 1577545200
    // 기준 시간대 변경 전 GMT+9 기준 하루의 시작을 점을 키로하여(period) 생성된 랭킹에 대응 하기 위함
    let targetTimezone = 0;
    if (targetTimestamp <= 1577545200 && this === PeriodType.DAILY) {
      targetTimezone = 9;
    }
    const startAtDate = moment.unix(targetTimestamp).utcOffset(targetTimezone);

    // 초 일괄 삭제
    startAtDate.second(0);

    switch (this) {
      case PeriodType.TOTAL:
        // 기준 일자를 포함한 그 이전 전체 포함
        // 기준 일자의 0시를 period 키로 지정
        startAtDate.hour(0).minute(0);
        endAt =
          startAtDate
            .clone()
            .add(1, 'day')
            .unix() - 1;
        period = startAtDate.unix();
        startAt = 0;
        break;
      case PeriodType.YEARLY:
        startAtDate
          .month(0)
          .date(1)
          .hour(0)
          .minute(0);
        endAt = startAtDate.unix() + 86400 * 365 - 1;
        startAt = period = startAtDate.unix();
        break;

      case PeriodType.QUARTERLY:
        {
          const m = startAtDate.month() + 1;
          startAtDate
            .month(m - ((m + 2) % 3) - 1)
            .date(1)
            .hour(0)
            .minute(0);
          endAt =
            startAtDate
              .clone()
              .add(3, 'month')
              .unix() - 1;
          startAt = period = startAtDate.unix();
        }
        break;

      case PeriodType.MONTHLY:
        startAtDate
          .date(1)
          .hour(0)
          .minute(0);
        endAt =
          startAtDate
            .clone()
            .add(1, 'month')
            .unix() - 1;
        startAt = period = startAtDate.unix();
        break;

      case PeriodType.WEEKLY:
        startAtDate
          .isoWeekday(1)
          .hour(0)
          .minute(0);
        endAt =
          startAtDate
            .clone()
            .add(7, 'day')
            .unix() - 1;
        startAt = period = startAtDate.unix();
        break;

      case PeriodType.DAILY:
        startAtDate.hour(0).minute(0);
        endAt =
          startAtDate
            .clone()
            .add(1, 'day')
            .unix() - 1;
        startAt = period = startAtDate.unix();
        break;

      case PeriodType.HOURLY:
        startAtDate.minute(0);
        endAt =
          startAtDate
            .clone()
            .add(1, 'hour')
            .unix() - 1;
        startAt = period = startAtDate.unix();
        break;

      case PeriodType.RECENTLY: // 최근 24시간
        endAt =
          startAtDate
            .clone()
            .add(1, 'hour')
            .minute(0)
            .unix() - 1;
        period = startAtDate.minute(0).unix();
        startAtDate.add(-23, 'hour');
        startAt = startAtDate.unix();
        break;

      default:
        throw new Error('지정되지 않은 PeriodType 입니다.');
    }

    return {
      period,
      startAt,
      endAt
    };
  }
}
