import type { Group } from '../model/groups.js';
import type Transaction from '../model/transaction.js';
import type { CanvasData } from './canvasClient.js';

export interface CanvasDiffGroupItem {
  groupIdx: number;
  groupName: { ko: string; en: string };
  reasonKey: 'student_id_cse' | 'course';
  reasonDetail?: string;
  status: 'new' | 'pending' | 'member';
}

export interface ProfilePair {
  studentNumber: string;
  major: string;
}

export interface CanvasDiff {
  profiles: { toAdd: Array<ProfilePair>; existing: Array<ProfilePair> };
  emails: {
    toAdd: Array<{ local: string; domain: string }>;
    existing: Array<{ local: string; domain: string }>;
  };
  groups: { items: Array<CanvasDiffGroupItem> };
}

function isUndergrad(sn: string): boolean {
  return /^\d{4}-1\d{4}$/.test(sn);
}
function isGrad(sn: string): boolean {
  return /^\d{4}-[23]\d{4}$/.test(sn);
}

interface GroupLookup {
  getByIdentifier(tr: Transaction, identifier: string): Promise<Group | null>;
}

export async function findMatchingGroups(
  tr: Transaction,
  canvas: CanvasData,
  groups: GroupLookup,
  currentMemberGroupIdxs: Set<number>,
  currentPendingGroupIdxs: Set<number>,
): Promise<Array<CanvasDiffGroupItem>> {
  const items: Array<CanvasDiffGroupItem> = [];

  function status(groupIdx: number): 'member' | 'pending' | 'new' {
    if (currentMemberGroupIdxs.has(groupIdx)) { return 'member'; }
    if (currentPendingGroupIdxs.has(groupIdx)) { return 'pending'; }
    return 'new';
  }

  if (canvas.xinicsProfiles.some(p => isUndergrad(p.studentNumber) && p.isCseMajor)) {
    const g = await groups.getByIdentifier(tr, 'undergraduate');
    if (g) {
      items.push({
        groupIdx: g.idx,
        groupName: g.name,
        reasonKey: 'student_id_cse',
        status: status(g.idx),
      });
    }
  }

  if (canvas.xinicsProfiles.some(p => isGrad(p.studentNumber) && p.isCseMajor)) {
    const g = await groups.getByIdentifier(tr, 'graduate');
    if (g) {
      items.push({
        groupIdx: g.idx,
        groupName: g.name,
        reasonKey: 'student_id_cse',
        status: status(g.idx),
      });
    }
  }

  for (const course of canvas.courses) {
    const g = await groups.getByIdentifier(tr, `course-${course.id}`);
    if (g) {
      items.push({
        groupIdx: g.idx,
        groupName: g.name,
        reasonKey: 'course',
        reasonDetail: course.termName || undefined,
        status: status(g.idx),
      });
    }
  }

  return items;
}

export function computeCanvasDiff(
  canvas: CanvasData,
  currentStudentNumbers: Array<string>,
  currentEmails: Array<{ local: string; domain: string }>,
  groupItems: Array<CanvasDiffGroupItem>,
): CanvasDiff {
  const canvasProfiles = canvas.xinicsProfiles.map(p => ({
    studentNumber: p.studentNumber,
    major: p.major,
  }));
  const currentSNSet = new Set(currentStudentNumbers);
  const profilesExisting = canvasProfiles.filter(p => currentSNSet.has(p.studentNumber));
  const profilesToAdd = canvasProfiles.filter(p => !currentSNSet.has(p.studentNumber));

  const canvasEmails = canvas.emails.map(addr => {
    const [local, domain] = addr.split('@');
    return { local, domain };
  });
  const currentEmailKeys = new Set(
    currentEmails.map(e => `${e.local.toLowerCase()}@${e.domain.toLowerCase()}`),
  );
  const emailsExisting = canvasEmails.filter(e =>
    currentEmailKeys.has(`${e.local.toLowerCase()}@${e.domain.toLowerCase()}`)
  );
  const emailsToAdd = canvasEmails.filter(e =>
    !currentEmailKeys.has(`${e.local.toLowerCase()}@${e.domain.toLowerCase()}`)
  );

  return {
    profiles: { toAdd: profilesToAdd, existing: profilesExisting },
    emails: { toAdd: emailsToAdd, existing: emailsExisting },
    groups: { items: groupItems },
  };
}
