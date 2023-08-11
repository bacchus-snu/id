# id.snucse.org API

[![Build Status](https://img.shields.io/github/actions/workflow/status/bacchus-snu/id/core.yml?branch=master)](https://github.com/bacchus-snu/id/actions/workflows/core.yml?query=branch%3Amaster)

Directory service for SNUCSE accounts

## 개발 환경 설정
**필독!** Bacchus ID는 Yarn Berry의 PnP 기능을 사용합니다. 아래 적힌 설명대로 개발 환경을
설정하세요.

```console
$ yarn install

$ # 편집기 SDK를 설치합니다. 설치 후에 편집기 설정을 수정해야 할 수도 있습니다.
$ # https://yarnpkg.com/getting-started/editor-sdks 를 참고하세요.
$ yarn dlx @yarnpkg/sdks vscode # or vim
```

## JWK 만들기
OIDC 설정에 필요한 JWK를 만들려면, 웹 브라우저 콘솔에서 다음 코드를 실행하세요.

```js
const key = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify'],
);
const jwk = await crypto.subtle.exportKey('jwk', key.privateKey);
console.log(JSON.stringify(jwk));
```
