import ErrorMessage from './model/ErrorMessage';

export function unknownError(error: Error): ErrorMessage {
  return new ErrorMessage({
    en: 'Unknown error',
    ko: '알 수 없는 오류가 발생했습니다',
  }, error);
}

export const userNameRegexError = new ErrorMessage({
  en: 'Empty ID not allowed',
  ko: 'ID는 비어있어서는 안 됩니다',
});

export function userNameNotAllowed(name: string): ErrorMessage {
  return new ErrorMessage({
    ko: `ID '${name}'를 쓸 수 없습니다.
ID는 3자 이상의 소문자 또는 숫자로만 구성되며, 숫자로 시작할 수 없습니다.`,
    en: `ID '${name}' is not allowed.
ID should be at least 3 characters, with lowercase letters or digits. ID canot start with a digit.`,
  });
}

export const userRealnameEmpty = new ErrorMessage({
  en: 'Empty realname not allowed',
  ko: '이름은 비어있어서는 안 됩니다',
});

export function userNameDuplicate(name: string): ErrorMessage {
  return new ErrorMessage({
    en: `ID '${name}' is already registered`,
    ko: `ID '${name}'은 이미 사용중입니다`,
  });
}
