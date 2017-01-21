import ErrorMessage from './types/ErrorMessage';

/**
 * Unknown error
 */
export function unknownError(error: Error): ErrorMessage {
  return new ErrorMessage({
    en: 'Unknown error',
    ko: '알 수 없는 오류가 발생했습니다',
  }, error);
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
 * ReservedUserName emptyString
 */
export const reservedUserNameEmpty = new ErrorMessage({
  en: 'Cannot insert empty string as a reserved username',
  ko: '빈 문자열을 예약된 ID로 입력할 수 없습니다',
});
