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
 * ID in use
 */
export function userNameDuplicate(name: string): ErrorMessage {
  return new ErrorMessage({
    en: `ID '${name}' is already registered`,
    ko: `ID '${name}': 이미 사용중입니다`,
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
export function grantRevokeOverlap(nodeId: number): ErrorMessage {
  return new ErrorMessage({
    en: `Cannot grant and revoke simultaneously. nodeId: ${nodeId}`,
    ko: `노드를 동시에 부여하고 회수할 수 없습니다. nodeId: ${nodeId}`,
  });
}
