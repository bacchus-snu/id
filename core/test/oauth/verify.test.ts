import test from 'ava'

import verify, { InvalidParameterError } from '../../src/oauth/verify'

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

test('should error if oauth_signature_method is not HMAC-SHA1', t => {
  const params = {
    oauth_consumer_key: 'foo',
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: '1552092094',
    oauth_nonce: 'something',
    oauth_version: '1.0',
    oauth_signature: 'QXvrYItMtRq69LraY5oX6hUb1HhQW+CelSRUGv+5StY=',
  }
  encodeParams(params)
  const method = 'GET'
  const requestUrl = 'https://id.snucse.org/api/oauth/1.0a/request'
  const consumerSecret = 'foofoo'
  const error = t.throws(() => verify(params, method, requestUrl, consumerSecret), InvalidParameterError)
  t.is(error.parameter, 'oauth_signature_method')
})

test('should error if oauth_signature is not present', t => {
  const params = {
    oauth_consumer_key: 'foo',
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: '1552092094',
    oauth_nonce: 'something',
    oauth_version: '1.0',
  }
  encodeParams(params)
  const method = 'GET'
  const requestUrl = 'https://id.snucse.org/api/oauth/1.0a/request'
  const consumerSecret = 'foofoo'
  const error = t.throws(() => verify(params, method, requestUrl, consumerSecret), InvalidParameterError)
  t.is(error.parameter, 'oauth_signature')
})

test('should work well with trivial ports (HTTPS)', t => {
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
  const requestUrl = 'https://id.snucse.org:443/api/oauth/1.0a/request'
  const consumerSecret = 'foofoo'
  t.true(verify(params, method, requestUrl, consumerSecret))
})

test('should work well with trivial ports (HTTP)', t => {
  const params = {
    oauth_consumer_key: 'foo',
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: '1552092094',
    oauth_nonce: 'something',
    oauth_version: '1.0',
    oauth_signature: 'YqyC5ofSt3BkBxcoWebEW7Q57S8=',
  }
  encodeParams(params)
  const method = 'GET'
  const requestUrl = 'http://id.snucse.org:80/api/oauth/1.0a/request'
  const consumerSecret = 'foofoo'
  t.true(verify(params, method, requestUrl, consumerSecret))
})

test('should work well with non-trivial ports', t => {
  const params = {
    oauth_consumer_key: 'foo',
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: '1552092094',
    oauth_nonce: 'something',
    oauth_version: '1.0',
    oauth_signature: 'GD9MP3lqxiCtyJ3Py7Sa+Ah6r2k=',
  }
  encodeParams(params)
  const method = 'GET'
  const requestUrl = 'http://localhost:50080/oauth/1.0a/request'
  const consumerSecret = 'foofoo'
  t.true(verify(params, method, requestUrl, consumerSecret))
})
