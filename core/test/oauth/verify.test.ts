import test from 'ava'

import verify from '../../src/oauth/verify'

function encodeParams(params: { [key: string]: string }) {
  for (const key of Object.keys(params)) {
    params[key] = encodeURIComponent(params[key])
  }
}

test('should verify well without token secret', t => {
  const params = {
    oauth_consumer_key: 'foo',
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: '1552092094',
    oauth_nonce: 'something',
    oauth_version: '1.0',
    oauth_signature: 'f3V6sKfRb8oYXx5p4yxJ21OVT1o=',
  }
  encodeParams(params)
  const method = 'GET'
  const requestUrl = 'https://id.snucse.org/api/oauth/1.0a/request'
  const consumerSecret = 'foofoo'
  t.true(verify(params, method, requestUrl, consumerSecret))
})

test('should verify well with token secret', t => {
  const params = {
    oauth_consumer_key: 'foo',
    oauth_token: 'SM/9JqmxGvxmdlteEvM30uMtUg8KgaRXySeoEEDgQtY=',
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: '1552092946',
    oauth_nonce: 'otherthing',
    oauth_version: '1.0',
    oauth_signature: 'kkCZh0N/dG0dVBc3kHiz/KQ8p6I=',
  }
  encodeParams(params)
  const method = 'POST'
  const requestUrl = 'https://id.snucse.org/api/oauth/1.0a/access'
  const consumerSecret = 'foofoo'
  const tokenSecret = '4CaorAAdmYmAMcBd7xglhgZNkFND8mKJ4/37C0XdDXk='
  t.true(verify(params, method, requestUrl, consumerSecret, tokenSecret))
})
