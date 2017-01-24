import ErrorMessage from './types/ErrorMessage';

/**
 * Unknown error
 */
export function unknownError(error: Error): ErrorMessage {
  return new ErrorMessage({
    en: 'Unknown error',
    ko: '알 수 없는 오류가 발생했습니다',
  }, error, 500);
}

/**
 * ID constraint check failed.
 */
export function userNameNotAllowed(name: string): ErrorMessage {
  return new ErrorMessage({
    ko: `ID '${name}': 쓸 수 없습니다.
ID는 3자 이상의 소문자 또는 숫자로만 구성되며, 숫자로 시작할 수 없습니다.`,
    en: `ID '${name}' is not allowed.
ID should be at least 3 characters, with lowercase letters or digits. ID canot start with a digit.`,
  });
}

/**
 * username in use
 */
export function userNameDuplicate(name: string): ErrorMessage {
  return new ErrorMessage({
    en: `ID '${name}' is already registered`,
    ko: `ID '${name}': 이미 사용중입니다`,
  });
}

/**
 * reserved username in use
 */
export function reservedUserNameDuplicate(name: string): ErrorMessage {
  return new ErrorMessage({
    en: `Reserved ID '${name}' is already registered`,
    ko: `예약된 ID '${name}': 이미 사용중입니다`,
  });
}

/**
 * address in use
 */
export function emailAddressDuplicate(local: string, domain: string): ErrorMessage {
  return new ErrorMessage({
    en: `Email address ${local}@${domain} is already registered`,
    ko: `전자우편 주소 ${local}@${domain}: 이미 사용중입니다`,
  });
}

/**
 * username not found
 */
export function userNameNotFound(name: string): ErrorMessage {
  return new ErrorMessage({
    en: `ID '${name}' not found`,
    ko: `ID '${name}': 없습니다`,
  });
}

export function emailAddressNotFound(local: string, domain: string): ErrorMessage {
  return new ErrorMessage({
    en: `Email address ${local}@${domain} not found`,
    ko: `전자우편 주소 ${local}@${domain}: 없습니다`,
  });
}

/**
 * ReservedUserName emptyString
 */
export const reservedUserNameEmpty = new ErrorMessage({
  en: 'An empty string cannot be a reserved ID',
  ko: '빈 문자열은 예약된 ID일 수 없습니다',
});

/**
 * No such ReservedUserName
 */
export function reservedUserNameNotFound(name: string): ErrorMessage {
  return new ErrorMessage({
    en: `No such reserved ID: ${name}`,
    ko: `예약된 ID가 없습니다: ${name}`,
  });
}

/**
 * shell id foreign constraint
 */
export function invalidShellId(shellId: number | null): ErrorMessage {
  return new ErrorMessage({
    en: `Invalid shellId: ${shellId}`,
    ko: `잘못된 셸 ID: ${shellId}`,
  });
}

/**
 * No such node id
 */
export function invalidNodeId(nodeId: number): ErrorMessage {
  return new ErrorMessage({
    en: `Invalid nodeId: ${nodeId}`,
    ko: `잘못된 노드ID: ${nodeId}`,
  });
}

/**
 * user id foreign constraint
 */
export function invalidUserId(userId: number): ErrorMessage {
  return new ErrorMessage({
    en: `Invalid userId: ${userId}`,
    ko: `잘못된 userId: ${userId}`,
  });
}

/**
 * No such nodeName
 */
export function nodeNameNotFound(name: string): ErrorMessage {
  return new ErrorMessage({
    en: `No such node: ${name}`,
    ko: `그런 이름의 노드가 없습니다: ${name}`,
  });
}

/**
 * users_nodes.modify error
 */
export function grantRemoveOverlap(nodeId: number): ErrorMessage {
  return new ErrorMessage({
    en: `Cannot grant and remove simultaneously. nodeId: ${nodeId}`,
    ko: `노드를 동시에 부여하고 삭제할 수 없습니다. nodeId: ${nodeId}`,
  });
}

/**
 * users_nodes.apply: already granted
 */
export function nodeAlreadyGranted(userId: number, nodeId: number): ErrorMessage {
  return new ErrorMessage({
    en: `Node ${nodeId} already granted to user ${userId}`,
    ko: `${nodeId}번 노드는 이미 ${userId}번 사용자에게 부여되었습니다`,
  });
}

/**
 * invalid emailAddressId
 */
export function invalidEmailAddressId(addressId: number): ErrorMessage {
  return new ErrorMessage({
    en: `Invalid emailAddressId: ${addressId}`,
    ko: `잘못된 emailAddressId: ${addressId}`,
  });
}

/**
 * invalid classId
 */
export function invalidClassId(classId: number): ErrorMessage {
  return new ErrorMessage({
    en: `Invalid classId: ${classId}`,
    ko: `잘못된 classId: ${classId}`,
  });
}

/**
 * Invalid token
 */
export const invalidToken = new ErrorMessage({
  en: 'Invalid token',
  ko: '잘못된 토큰입니다',
});

export function invalidEmailAddress(local: string, domain: string): ErrorMessage {
  return new ErrorMessage({
    en: `Invalid email address: ${local}@${domain}`,
    ko: `잘못된 전자우편 주소: ${local}@${domain}`,
  });
}
