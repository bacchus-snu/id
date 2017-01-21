import * as infos from './infos';
import Conflict from './model/Conflict';
import Node from './model/Node';
import * as terms from './terms';

/**
 * 1. Lifecycle of users
 *   - Not exists -> Exists
 *     To create a user, a newly granted node is needed
 *   - Exists -> Not exists
 *     A user is completely deleted from the system when the user loses all valid nodes.
 *   - Alive as an account <-> A ghost
 *     A user is alive as an account if and only if 'account' node is in valid set of the user.
 *     The system can retain personal information about the user only if the user is alive;
 *     the system must drop all personal information when the user loses 'account' node.
 *
 * 2. Implementation of lifecycle policy of individual accounts
 * Newly registered individual users are granted with 'individual-account' node. This enables
 * new users to navigate id.snucse.org system and take appropriate actions such as requesting
 * for nodes, applying for classes, accepting terms, or providing their personal information.
 *
 * This basic 'indiviual-account' node is not eternal. This node will expire after the specified
 * duration from the time when the user is created. Users must obtain other valid nodes
 * to prevent their account from deleted. This enables stale accounts to be deleted.
 *
 * 3. Trace nodes
 * For some external systems plugged to id.snucse.org, users are distinguished by POSIX uid,
 * username, or userId. Deleting stale accounts enables id.snucse.org to recycle these
 * identifiers. Resources named by these identifiers must be freed before deleting users,
 * in order to prevent unexpected data leakage to future users that happened to be assigned
 * with those identifiers.
 *
 * That's where 'trace nodes' comes in. As users authenticate to external systems and
 * creates traces with these identifiers, trace nodes are granted. Trace nodes never imply
 * 'account' node, so that personal information of users with trace nodes only are never stored.
 * A user can be deleted only after all traces are safely purged from external systems.
 */

export const nodes: Array<Node> = [];
const snu = 'snu.ac.kr';
const bacchus = 'bacchus.snucse.org';

/**
 * Node 0~8: Basic user category definition.
 */

// This node enables storing privacy information of the user
const account: Node = {
  nodeId: 0,
  name: 'account',
  description: {
    ko: '계정',
    en: 'Account',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(account);

// Users with this node in valid set can log in to id.snucse.org
const individual: Node = {
  nodeId: 1,
  name: 'individual-account',
  description: {
    ko: '개인 계정',
    en: 'Individual account',
  },
  implies: [account],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname],
  requiredVerifiedEmail: [],
};
nodes.push(individual);

// Shared accounts bypass term acceptance checks.
const shared = {
  nodeId: 2,
  name: 'shared-account',
  description: {
    ko: '공용 계정',
    en: 'Shared account',
  },
  implies: [account],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname],
  requiredVerifiedEmail: [],
};
nodes.push(shared);

// Users with staff privilege can
//   * query account details of other users
//   * review and approve changes on CSE membership status of other users
const staff = {
  nodeId: 4,
  name: 'staff-privilege',
  description: {
    ko: '행정 권한',
    en: 'Staff privilege',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(staff);

// Administrators have staff privileges and they can
//   * review and approve classes submitted by users
//   * review and approve class enrollment requests
//   * modify granted nodes of other users
//   * block/unblock users
const admin = {
  nodeId: 3,
  name: 'admin-privilege',
  description: {
    ko: '관리 권한',
    en: 'Administrator privilege',
  },
  implies: [staff],
  impliedBy: [],
  requiredTerms: [],
  requiredInfo: [],
  requiredVerifiedEmail: [bacchus],
};
nodes.push(admin);

/**
 * Node 1xx: Privileges.
 *   - 10x: SNUCSE, CSE community site
 *   - 11x: id.snucse.org apps (formerly SNUCSE AppCenter)
 *   - 12x: mail.snucse.org
 *   - 13x: id.snucse.org classroom service
 *   - 14x: advanced resource
 *   - 15x: servers
 *   - 16x: PCs
 */

// users with this node can log in to www.snucse.org
const snucse = {
  nodeId: 100,
  name: 'use-snucse',
  description: {
    ko: '스누씨 이용 가능',
    en: 'SNUCSE access',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [terms.snucseTerm],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(snucse);

const snucseFull = {
  nodeId: 101,
  name: 'use-snucse-full',
  description: {
    ko: '스누씨 전체에 접근 가능',
    en: 'SNUCSE full access',
  },
  implies: [snucse],
  impliedBy: [],
  requiredTerms: [],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(snucseFull);

const snucseProfile = {
  nodeId: 102,
  name: 'use-snucse-profile',
  description: {
    ko: '스누씨 일부 프로필에 접근 가능',
    en: 'SNUCSE profile access',
  },
  implies: [snucse],
  impliedBy: [],
  requiredTerms: [],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(snucseProfile);

const thirdPartyApps = {
  nodeId: 110,
  name: 'use-3rd-party-apps',
  description: {
    ko: '제 3자 앱 이용',
    en: 'Can use third party apps',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(thirdPartyApps);

const publishApps = {
  nodeId: 111,
  name: 'publish-apps',
  description: {
    ko: '앱 등록',
    en: 'Can publish apps',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [terms.appDevTerm],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(publishApps);

const snucseEmail = {
  nodeId: 120,
  name: 'use-snucse-email',
  description: {
    ko: 'SNUCSE 메일 서비스 이용',
    en: 'Use SNUCSE mail',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [terms.emailTerm],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(snucseEmail);

const createClass = {
  nodeId: 130,
  name: 'create-class',
  description: {
    ko: '클래스 생성',
    en: 'Create a class',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [terms.classTerm],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(createClass);

const advancedResourceQualification = {
  nodeId: 141,
  name: 'qualified-for-advanced-resource',
  description: {
    ko: '고급 실습 자원 신청 가능',
    en: 'Can request advanced resources',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(advancedResourceQualification);

const advancedResourceRequested = {
  nodeId: 142,
  name: 'requested-advanced-resource',
  description: {
    ko: '고급 실습 자원을 신청함',
    en: 'Requested advanced resource',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [terms.advancedTerm],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(advancedResourceRequested);

const advancedResource = {
  nodeId: 140,
  name: 'use-advanced-resource',
  description: {
    ko: '고급 실습 자원 이용',
    en: 'Can access advanced resources',
  },
  implies: [],
  impliedBy: [advancedResourceQualification, advancedResourceRequested],
  requiredTerms: [],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(advancedResource);

const martini = {
  nodeId: 150,
  name: 'use-martini',
  description: {
    ko: '마티니 이용',
    en: 'Can access martini',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [terms.serverTerm],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(martini);

const mimosa = {
  nodeId: 151,
  name: 'use-mimosa',
  description: {
    ko: '미모사 이용',
    en: 'Can access mimosa',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [terms.serverTerm],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(mimosa);

const sync = {
  nodeId: 160,
  name: 'lab-home-sync-enabled',
  description: {
    ko: '실습실 홈 디렉토리 동기화 사용',
    en: 'Use home directory synchronization for lab PCs',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [terms.pcTerm],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(sync);

const software = {
  nodeId: 161,
  name: 'use-software-lab-pc',
  description: {
    ko: '소프트웨어 실습실 PC 사용',
    en: 'Access software lab PCs',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [terms.pcTerm],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(software);

const hardware = {
  nodeId: 162,
  name: 'use-hardware-lab-pc',
  description: {
    ko: '하드웨어 실습실 PC 사용',
    en: 'Access hardware lab PCs',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [terms.pcTerm],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(hardware);

const loungeLab = {
  nodeId: 163,
  name: 'use-lounge-lab-pc',
  description: {
    ko: '314호 실습 PC 사용',
    en: 'Access lab PCs in room 314',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [terms.pcTerm],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(loungeLab);

const loungeWin = {
  nodeId: 164,
  name: 'use-lounge-win-pc',
  description: {
    ko: '314호 Windows PC 사용',
    en: 'Access Windows PCs in room 314',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [terms.pcTerm],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(loungeWin);

/**
 * Node 0~8: Basic user category definition. (cont'd)
 */

const cse = {
  nodeId: 5,
  name: 'cse-member',
  description: {
    ko: '컴퓨터공학부 구성원',
    en: 'CSE member',
  },
  implies: [
    individual,
    snucseFull,
    thirdPartyApps,
    publishApps,
    snucseEmail,
    createClass,
    advancedResourceQualification,
    martini,
    mimosa,
    sync,
    software,
    hardware,
    loungeLab,
    loungeWin,
  ],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname],
  requiredVerifiedEmail: [snu],
};
nodes.push(cse);

const ece = {
  nodeId: 6,
  name: 'ece-from-cse',
  description: {
    ko: '전기·정보공학부로 전공진입한 컴반',
    en: 'ECE student from CSE class',
  },
  implies: [individual, snucseFull],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname, infos.snuidBachelor],
  requiredVerifiedEmail: [snu],
};
nodes.push(ece);

const preliminary = {
  nodeId: 7,
  name: 'preliminary',
  description: {
    ko: '예비 새내기',
    en: 'Undergraduate preliminary',
  },
  implies: [individual, snucseProfile],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname],
  requiredVerifiedEmail: [],
};
nodes.push(preliminary);

const club = {
  nodeId: 8,
  name: 'club',
  description: {
    ko: '동아리',
    en: 'Student club',
  },
  implies: [shared],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname],
  requiredVerifiedEmail: [],
};
nodes.push(club);

/**
 * Node 10~29: CSE membership
 *   - 1x: undergraduate
 *   - 2x: graduate
 *   - 3x: others
 */

const major = {
  nodeId: 10,
  name: 'cse-major',
  description: {
    ko: '컴퓨터공학 주전공',
    en: 'CSE major',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname, infos.snuidBachelor],
  requiredVerifiedEmail: [snu],
};
nodes.push(major);

const doub = {
  nodeId: 11,
  name: 'cse-double-major',
  description: {
    ko: '컴퓨터공학 복수전공',
    en: 'CSE double major',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname, infos.snuidBachelor],
  requiredVerifiedEmail: [snu],
};
nodes.push(doub);

const minor = {
  nodeId: 12,
  name: 'cse-minor',
  description: {
    ko: '컴퓨터공학 부전공',
    en: 'CSE minor',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname, infos.snuidBachelor],
  requiredVerifiedEmail: [snu],
};
nodes.push(minor);

const combined = {
  nodeId: 13,
  name: 'cse-combined-major',
  description: {
    ko: '컴퓨터공학 연합전공',
    en: 'CSE combined major',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname, infos.snuidBachelor],
  requiredVerifiedEmail: [snu],
};
nodes.push(combined);

const extended = {
  nodeId: 14,
  name: 'cse-extended-major',
  description: {
    ko: '컴퓨터공학 연계전공',
    en: 'CSE extended(interdisciplinary) major',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname, infos.snuidBachelor],
  requiredVerifiedEmail: [snu],
};
nodes.push(extended);

const exchange = {
  nodeId: 15,
  name: 'cse-exchange',
  description: {
    ko: '교환학생',
    en: 'Exchange student',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname, infos.snuidBachelor],
  requiredVerifiedEmail: [snu],
};
nodes.push(exchange);

const undergraduateAlumni = {
  nodeId: 16,
  name: 'undergraduate-alumni',
  description: {
    ko: '학부 졸업생',
    en: 'Undergraduate alumni',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname, infos.snuidBachelor],
  requiredVerifiedEmail: [snu],
};
nodes.push(undergraduateAlumni);

const graduateAlumni = {
  nodeId: 20,
  name: 'graduate-alumni',
  description: {
    ko: '대학원 졸업',
    en: 'Graduate alumni',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname],
  requiredVerifiedEmail: [snu],
};
nodes.push(graduateAlumni);

const master = {
  nodeId: 21,
  name: 'master-course',
  description: {
    ko: '석사과정',
    en: 'Master course',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname, infos.snuidMaster],
  requiredVerifiedEmail: [snu],
};
nodes.push(master);

const doctor = {
  nodeId: 22,
  name: 'doctoral-course',
  description: {
    ko: '박사과정',
    en: 'Doctoral course',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname, infos.snuidDoctor],
  requiredVerifiedEmail: [snu],
};
nodes.push(doctor);

const masterDoctor = {
  nodeId: 23,
  name: 'master-doctoral-course',
  description: {
    ko: '석박통합과정',
    en: 'Master-doctoral course',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname, infos.snuidMasterDoctor],
  requiredVerifiedEmail: [snu],
};
nodes.push(masterDoctor);

const office = {
  nodeId: 30,
  name: 'cse-staff',
  description: {
    ko: '컴퓨터공학부 행정실',
    en: 'Department staff',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname],
  requiredVerifiedEmail: [],
};
nodes.push(office);

const professor = {
  nodeId: 31,
  name: 'cse-professor',
  description: {
    ko: '컴퓨터공학부 교수',
    en: 'CSE professor',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [terms.privacy],
  requiredInfo: [infos.realname],
  requiredVerifiedEmail: [],
};
nodes.push(professor);

/**
 * 2xx: Traces
 */

const usedSNUCSE = {
  nodeId: 200,
  name: 'used-snucse',
  description: {
    ko: '스누씨 사용기록이 있음',
    en: 'Used SNUCSE',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(usedSNUCSE);

const usedThirdPartyApp = {
  nodeId: 201,
  name: 'used-3rd-party-app',
  description: {
    ko: '제 3자 앱 사용 기록이 있음',
    en: 'Used third party app(s)',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(usedThirdPartyApp);

const hasSNUCSEEmail = {
  nodeId: 202,
  name: 'has-snucse-email',
  description: {
    ko: 'SNUCSE 메일 계정이 있음',
    en: 'Has snucse mail account',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(hasSNUCSEEmail);

const hasMartiniHome = {
  nodeId: 203,
  name: 'has-martini-home',
  description: {
    ko: '마티니에 홈 디렉토리가 있음',
    en: 'Has home directory in martini',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(hasMartiniHome);

const hasMimosaHome = {
  nodeId: 204,
  name: 'has-mimosa-home',
  description: {
    ko: '미모사에 홈 디렉토리가 있음',
    en: 'Has home directory in mimosa',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(hasMimosaHome);

const hasSherryHome = {
  nodeId: 205,
  name: 'has-sherry-home',
  description: {
    ko: '셰리에 홈 디렉토리가 있음',
    en: 'Has home directory in sherry',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(hasSherryHome);

const hasKofHome = {
  nodeId: 206,
  name: 'has-kof-home',
  description: {
    ko: '키스 오브 파이어에 홈 디렉토리가 있음',
    en: 'Has home directory in kiss of fire',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
  requiredInfo: [],
  requiredVerifiedEmail: [],
};
nodes.push(hasKofHome);

/**
 * Some basic nodes or CSE membership nodes conflicts with each other
 * Clearing conflicts by revoking old nodes helps maintaining user database cleaner
 */
export const conflicts: Array<Conflict> = [
  { a: shared, b: individual },
  { a: shared, b: staff },
  { a: shared, b: admin },
  { a: ece, b: major },
  { a: ece, b: exchange },
  { a: ece, b: preliminary },
  { a: major, b: doub },
  { a: major, b: minor },
  { a: major, b: combined },
  { a: major, b: extended },
  { a: major, b: exchange },
  { a: major, b: undergraduateAlumni },
  { a: major, b: preliminary },
  { a: major, b: master },
  { a: major, b: doctor },
  { a: major, b: masterDoctor },
  { a: major, b: graduateAlumni },
  { a: doub, b: minor },
  { a: doub, b: combined },
  { a: doub, b: extended },
  { a: doub, b: exchange },
  { a: doub, b: undergraduateAlumni },
  { a: doub, b: preliminary },
  { a: doub, b: master },
  { a: doub, b: doctor },
  { a: doub, b: masterDoctor },
  { a: doub, b: graduateAlumni },
  { a: minor, b: combined },
  { a: minor, b: extended },
  { a: minor, b: exchange },
  { a: minor, b: undergraduateAlumni },
  { a: minor, b: preliminary },
  { a: minor, b: master },
  { a: minor, b: doctor },
  { a: minor, b: masterDoctor },
  { a: minor, b: graduateAlumni },
  { a: combined, b: extended },
  { a: combined, b: exchange },
  { a: combined, b: undergraduateAlumni },
  { a: combined, b: preliminary },
  { a: combined, b: master },
  { a: combined, b: doctor },
  { a: combined, b: masterDoctor },
  { a: combined, b: graduateAlumni },
  { a: extended, b: exchange },
  { a: extended, b: undergraduateAlumni },
  { a: extended, b: preliminary },
  { a: extended, b: master },
  { a: extended, b: doctor },
  { a: extended, b: masterDoctor },
  { a: extended, b: graduateAlumni },
  { a: exchange, b: undergraduateAlumni },
  { a: exchange, b: preliminary },
  { a: exchange, b: master },
  { a: exchange, b: doctor },
  { a: exchange, b: masterDoctor },
  { a: exchange, b: graduateAlumni },
  { a: undergraduateAlumni, b: preliminary },
  { a: preliminary, b: master },
  { a: preliminary, b: doctor },
  { a: preliminary, b: masterDoctor },
  { a: preliminary, b: graduateAlumni },
  { a: master, b: graduateAlumni },
  { a: doctor, b: graduateAlumni },
  { a: masterDoctor, b: graduateAlumni },
  { a: master, b: doctor },
  { a: master, b: masterDoctor },
  { a: doctor, b: masterDoctor },
];
