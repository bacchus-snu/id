import Conflict from './model/Conflict';
import Node from './model/Node';
import { privacy, snucseTerm, emailTerm, appDevTerm, classTerm, advancedTerm, serverTerm, pcTerm } from './terms';

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
};

// Users with this node can log in to id.snucse.org
const individual: Node = {
  nodeId: 1,
  name: 'individual-account',
  description: {
    ko: '개인 계정',
    en: 'Individual account',
  },
  implies: [account],
  impliedBy: [],
  requiredTerms: [],
};

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
  requiredTerms: [],
};

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
};

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
};

const snucse = {
  nodeId: 100,
  name: 'use-snucse',
  description: {
    ko: '스누씨 이용 가능',
    en: 'SNUCSE access',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [snucseTerm],
};

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
};

const snucseProfile = {
  nodeId: 102,
  name: 'use-snucse-profile',
  description: {
    ko: '스누씨 일부 프로필에 접근 가능',
    en: 'SNUCSE profile access',
  },
  implies: [snucse],
  impliedBy: [],
  requiredTerms: [privacy],
};

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
};

const publishApps = {
  nodeId: 111,
  name: 'publish-apps',
  description: {
    ko: '앱 등록',
    en: 'Can publish apps',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [appDevTerm],
};

const snucseEmail = {
  nodeId: 120,
  name: 'use-snucse-email',
  description: {
    ko: 'SNUCSE 메일 서비스 이용',
    en: 'Use SNUCSE mail',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [emailTerm],
};

const createClass = {
  nodeId: 130,
  name: 'create-class',
  description: {
    ko: '클래스 생성',
    en: 'Create a class',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [classTerm],
};

const advacedResourceQualification = {
  nodeId: 141,
  name: 'qualified-for-advanced-resource',
  description: {
    ko: '고급 실습 자원 신청 가능',
    en: 'Can request advanced resources',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
};

const advancedResourceRequested = {
  nodeId: 142,
  name: 'requested-advanced-resource',
  description: {
    ko: '고급 실습 자원을 신청함',
    en: 'Requested advanced resource',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
};

const advancedResource = {
  nodeId: 140,
  name: 'use-advanced-resource',
  description: {
    ko: '고급 실습 자원 이용',
    en: 'Can access advanced resources',
  },
  implies: [],
  impliedBy: [advancedResourceQualification, advancedResourceRequested],
  requiredTerms: [advancedTerm],
};

const martini = {
  nodeId: 150,
  name: 'use-martini',
  description: {
    ko: '마티니 이용',
    en: 'Can access martini',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [serverTerm],
};

const mimosa = {
  nodeId: 151,
  name: 'use-mimosa',
  description: {
    ko: '미모사 이용',
    en: 'Can access mimosa',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [serverTerm],
};

const sync = {
  nodeId: 160,
  name: 'home-synchronization-enabled',
  description: {
    ko: '실습실 홈 디렉토리 동기화 사용',
    en: 'Use home directory synchronization for lab PCs',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
};

const software = {
  nodeId: 161,
  name: 'use-software-lab-pc',
  description: {
    ko: '소프트웨어 실습실 PC 사용',
    en: 'Access software lab PCs',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [pcTerm],
};

const hardware = {
  nodeId: 162,
  name: 'use-hardware-lab-pc',
  description: {
    ko: '하드웨어 실습실 PC 사용',
    en: 'Access hardware lab PCs',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [pcTerm],
};

const cse = {
  nodeId: 4,
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
  ],
  impliedBy: [],
  requiredTerms: [],
};

const ece = {
  nodeId: 5,
  name: 'ece-from-cse',
  description: {
    ko: '전기·정보공학부로 전공진입한 컴반',
    en: 'ECE student from CSE class',
  },
  implies: [individual, snucseFull],
  impliedBy: [],
  requiredTerms: [privacy],
};

const major = {
  nodeId: 10,
  name: 'cse-major',
  description: {
    ko: '컴퓨터공학 주전공',
    en: 'CSE major',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [privacy],
};

const doub = {
  nodeId: 11,
  name: 'cse-double-major',
  description: {
    ko: '컴퓨터공학 복수전공',
    en: 'CSE double major',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [privacy],
};

const minor = {
  nodeId: 12,
  name: 'cse-minor',
  description: {
    ko: '컴퓨터공학 부전공',
    en: 'CSE minor',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [privacy],
};

const combined = {
  nodeId: 13,
  name: 'cse-combined-major',
  description: {
    ko: '컴퓨터공학 연합전공',
    en: 'CSE combined major',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [privacy],
};

const extended = {
  nodeId: 14,
  name: 'cse-extended-major',
  description: {
    ko: '컴퓨터공학 연계전공',
    en: 'CSE extended(interdisciplinary) major',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [privacy],
};

const exchange = {
  nodeId: 15,
  name: 'cse-exchange',
  description: {
    ko: '교환학생',
    en: 'Exchange student',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [privacy],
};

const undergraduateAlumni = {
  nodeId: 16,
  name: 'undergraduate-alumni',
  description: {
    ko: '학부 졸업생',
    en: 'Undergraduate alumni',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [privacy],
};

const preliminary = {
  nodeId: 17,
  name: 'preliminary',
  description: {
    ko: '예비 새내기',
    en: 'Undergraduate preliminary',
  },
  implies: [snucseProfile],
  impliedBy: [],
  requiredTerms: [privacy],
};

const club = {
  nodeId: 18,
  name: 'club',
  description: {
    ko: '동아리',
    en: 'Student club',
  },
  implies: [shared],
  impliedBy: [],
  requiredTerms: [privacy],
};

const graduate = {
  nodeId: 20,
  name: 'graduate',
  description: {
    ko: '대학원생',
    en: 'Graduate student',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [privacy],
};

const graduateAlumni = {
  nodeId: 21,
  name: 'graduate-alumni',
  description: {
    ko: '대학원 졸업',
    en: 'Graduate alumni',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [privacy],
};

const office = {
  nodeId: 22,
  name: 'cse-staff',
  description: {
    ko: '컴퓨터공학부 행정실',
    en: 'Department staff',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [privacy],
};

const professor = {
  nodeId: 23,
  name: 'cse-professor',
  description: {
    ko: '컴퓨터공학부 교수',
    en: 'CSE professor',
  },
  implies: [cse],
  impliedBy: [],
  requiredTerms: [privacy],
};

const traceSNUCSE = {
  nodeId: 200,
  name: 'trace-snucse',
  description: {
    ko: '스누씨 사용기록이 있음',
    en: 'Used SNUCSE',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
};

const traceApp = {
  nodeId: 201,
  name: 'trace-3rd-app',
  description: {
    ko: '제 3자 앱 사용 기록이 있음',
    en: 'Used third party app(s)',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
};

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
};

const traceMartini = {
  nodeId: 203,
  name: 'trace-martini',
  description: {
    ko: '마티니 사용기록이 있음',
    en: 'Used martini',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
};

const traceMimosa = {
  nodeId: 204,
  name: 'trace-mimosa',
  description: {
    ko: '미모사 사용기록이 있음',
    en: 'Used mimosa',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
};

const traceLab = {
  nodeId: 205,
  name: 'trace-lab-pc',
  description: {
    ko: '실습실 PC 사용기록이 있음',
    en: 'Used lab PC(s)',
  },
  implies: [],
  impliedBy: [],
  requiredTerms: [],
};

export const nodes: Array<Node> = [
  individual,
  shared,
  staff,
  admin,
];

export const conflicts: Array<Conflict> = [
  { a:shared , b: individual },
  { a:shared , b: staff },
  { a:shared , b: admin },
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
  { a: major, b: graduate },
  { a: major, b: graduateAlumni },
  { a: doub, b: minor },
  { a: doub, b: combined },
  { a: doub, b: extended },
  { a: doub, b: exchange },
  { a: doub, b: undergraduateAlumni },
  { a: doub, b: preliminary },
  { a: doub, b: graduate },
  { a: doub, b: graduateAlumni },
  { a: minor, b: combined },
  { a: minor, b: extended },
  { a: minor, b: exchange },
  { a: minor, b: undergraduateAlumni },
  { a: minor, b: preliminary },
  { a: minor, b: graduate },
  { a: minor, b: graduateAlumni },
  { a: combined, b: extended },
  { a: combined, b: exchange },
  { a: combined, b: undergraduateAlumni },
  { a: combined, b: preliminary },
  { a: combined, b: graduate },
  { a: combined, b: graduateAlumni },
  { a: extended, b: exchange },
  { a: extended, b: undergraduateAlumni },
  { a: extended, b: preliminary },
  { a: extended, b: graduate },
  { a: extended, b: graduateAlumni },
  { a: exchange, b: undergraduateAlumni },
  { a: exchange, b: preliminary },
  { a: exchange, b: graduate },
  { a: exchange, b: graduateAlumni },
  { a: undergraduateAlumni, b: preliminary },
  { a: preliminary, b: graduate },
  { a: preliminary, b: graduateAlumni },
  { a: graduate, b: graduateAlumni },
];
