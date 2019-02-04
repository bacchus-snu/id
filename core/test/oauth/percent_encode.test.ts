import test from 'ava'

import percentEncode from '../../src/oauth/percent_encode'

test('percentEncode handles UTF-8 strings', t => {
  t.is(percentEncode('밯망희'), '%EB%B0%AF%EB%A7%9D%ED%9D%AC')
  t.is(percentEncode('09가a-z-A.~나_Z_'), '09%EA%B0%80a-z-A.~%EB%82%98_Z_')
})
