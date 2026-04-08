export interface CanvasProfile {
  name: string;
  loginId: string;
  primaryEmail: string;
}

export interface CanvasCourse {
  id: number;
  name: string;
  courseCode: string;
  termName: string;
}

export interface XinicsProfile {
  studentNumber: string;
  major: string;
  isCseMajor: boolean;
}

export interface CanvasData {
  profile: CanvasProfile;
  emails: Array<string>;
  courses: Array<CanvasCourse>;
  xinicsProfiles: Array<XinicsProfile>;
}

async function canvasFetch(baseUrl: string, token: string, path: string): Promise<Response> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok) { throw new Error(`Canvas API error: ${response.status} ${path}`); }
  return response;
}

export async function getProfile(baseUrl: string, token: string): Promise<CanvasProfile> {
  const res = await canvasFetch(baseUrl, token, '/api/v1/users/self/profile');
  const data = await res.json();
  return { name: data.name, loginId: data.login_id, primaryEmail: data.primary_email };
}

export async function getEmails(baseUrl: string, token: string): Promise<Array<string>> {
  const res = await canvasFetch(baseUrl, token, '/api/v1/users/self/communication_channels');
  const data: Array<{ type: string; address: string }> = await res.json();
  return data.filter(ch => ch.type === 'email').map(ch => ch.address);
}

export async function getCourses(baseUrl: string, token: string): Promise<Array<CanvasCourse>> {
  const res = await canvasFetch(
    baseUrl,
    token,
    '/api/v1/courses?enrollment_type=student&state[]=available&per_page=100&include[]=term',
  );
  const data: Array<{ id: number; name: string; course_code: string; term?: { name?: string } }> =
    await res.json();
  return data.map(c => ({
    id: c.id,
    name: c.name,
    courseCode: c.course_code,
    termName: c.term?.name ?? '',
  }));
}

/**
 * Parse Xinics SSO HTML response for student profiles.
 *
 * Confirmed HTML structure (2026-04-08):
 *   <button id="btn_sel_{student_number}"> (학생) {student_number} {major} </button>
 *   <button class="disable" disabled id="btn_sel_{student_number}"> (학생) {student_number} {major} </button>
 */
export function parseXinicsProfiles(html: string): Array<XinicsProfile> {
  const profiles: Array<XinicsProfile> = [];
  const seen = new Set<string>();
  const btnRegex =
    /id="btn_sel_(\d{4}-[123]\d{4})"[^>]*>[^<]*\([^)]+\)\s*\d{4}-[123]\d{4}\s+(\S+)/g;
  let match;
  while ((match = btnRegex.exec(html)) !== null) {
    const studentNumber = match[1];
    const major = match[2];
    if (!seen.has(studentNumber)) {
      seen.add(studentNumber);
      profiles.push({ studentNumber, major, isCseMajor: major.includes('컴퓨터공학') });
    }
  }
  // fallback: if button parsing fails, extract student number patterns from full HTML
  if (profiles.length === 0) {
    const fallback = /(\d{4}-[123]\d{4})/g;
    let fm;
    while ((fm = fallback.exec(html)) !== null) {
      if (!seen.has(fm[1])) {
        seen.add(fm[1]);
        const ctx = html.slice(Math.max(0, fm.index - 100), fm.index + 100);
        const majorMatch = ctx.match(/\d{4}-[123]\d{4}\s+(\S+)/);
        const fallbackMajor = majorMatch?.[1] ?? '';
        profiles.push({
          studentNumber: fm[1],
          major: fallbackMajor,
          isCseMajor: ctx.includes('컴퓨터공학'),
        });
      }
    }
  }
  return profiles;
}

function extractFormData(html: string): { action: string; fields: Record<string, string> } | null {
  // form 태그에서 id와 action 속성 순서가 다를 수 있으므로 별도 추출
  const formTagMatch = html.match(/<form[^>]*id="tool_form"[^>]*>/s)
    ?? html.match(/<form[^>]*action="[^"]*"[^>]*id="tool_form"[^>]*>/s);
  if (!formTagMatch) { return null; }
  const formTag = formTagMatch[0];
  const actionMatch = formTag.match(/action="([^"]+)"/);
  if (!actionMatch) { return null; }
  const action = actionMatch[1];
  // form 태그부터 </form>까지의 범위에서만 hidden input 추출
  const formStart = html.indexOf(formTagMatch[0]);
  const formEnd = html.indexOf('</form>', formStart);
  const formHtml = formEnd > formStart ? html.slice(formStart, formEnd) : html;
  const fields: Record<string, string> = {};
  const inputRegex = /<input[^>]*type="hidden"[^>]*>/g;
  let m;
  while ((m = inputRegex.exec(formHtml)) !== null) {
    const nameMatch = m[0].match(/name="([^"]+)"/);
    const valueMatch = m[0].match(/value="([^"]*)"/);
    if (nameMatch) { fields[nameMatch[1]] = valueMatch?.[1] ?? ''; }
  }
  return { action, fields };
}

export async function fetchCanvasData(
  baseUrl: string,
  xinicsSsoToolId: string,
  token: string,
): Promise<CanvasData> {
  const [profile, emails, courses, ltiHtml] = await Promise.all([
    getProfile(baseUrl, token),
    getEmails(baseUrl, token),
    getCourses(baseUrl, token),
    (async () => {
      const launchRes = await canvasFetch(
        baseUrl,
        token,
        `/api/v1/accounts/1/external_tools/sessionless_launch?id=${xinicsSsoToolId}`,
      );
      const { url } = await launchRes.json();
      const pageRes = await fetch(url, { redirect: 'follow' });
      return pageRes.text();
    })(),
  ]);

  let xinicsProfiles: Array<XinicsProfile> = [];
  const formData = extractFormData(ltiHtml);
  if (formData?.action) {
    try {
      const body = new URLSearchParams(formData.fields);
      const res = await fetch(formData.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        redirect: 'follow',
      });
      xinicsProfiles = parseXinicsProfiles(await res.text());
    } catch { /* fallback to loginId only */ }
  }

  // Ensure loginId is always included
  if (!xinicsProfiles.find(p => p.studentNumber === profile.loginId)) {
    xinicsProfiles.unshift({ studentNumber: profile.loginId, major: '', isCseMajor: false });
  }

  return { profile, emails, courses, xinicsProfiles };
}
