import Transaction from './transaction.js';
import type { Translation } from './translation.js';

interface AnnouncementRow {
  idx: number;
  title_ko: string;
  title_en: string;
  body_ko: string;
  body_en: string;
  url: string | null;
  group_idx: number | null;
}

export interface Announcement {
  idx: number;
  title: Translation;
  body: Translation;
  url: string | null;
  groupIdx: number | null;
}

export interface AnnouncementOptions {
  url?: string;
  groupIdx?: number;
  startsAt?: Date;
  endsAt?: Date;
}

export default class Announcements {
  public async create(
    tr: Transaction,
    title: Translation,
    body: Translation,
    options: AnnouncementOptions = {},
  ): Promise<number> {
    const query = 'INSERT INTO announcements(title_ko, title_en, body_ko, body_en, url, group_idx, '
      + 'starts_at, ends_at) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()), $8) RETURNING idx';
    const result = await tr.query<{ idx: number }>(query, [
      title.ko,
      title.en,
      body.ko,
      body.en,
      options.url ?? null,
      options.groupIdx ?? null,
      options.startsAt ?? null,
      options.endsAt ?? null,
    ]);
    return result.rows[0].idx;
  }

  public async getActive(tr: Transaction): Promise<Array<Announcement>> {
    const query =
      'SELECT idx, title_ko, title_en, body_ko, body_en, url, group_idx FROM announcements '
      + 'WHERE starts_at <= now() AND (ends_at IS NULL OR ends_at > now()) ORDER BY idx DESC';
    const result = await tr.query<AnnouncementRow>(query);
    return result.rows.map(row => ({
      idx: row.idx,
      title: {
        ko: row.title_ko,
        en: row.title_en,
      },
      body: {
        ko: row.body_ko,
        en: row.body_en,
      },
      url: row.url,
      groupIdx: row.group_idx,
    }));
  }
}
