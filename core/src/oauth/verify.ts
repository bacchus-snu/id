import * as crypto from 'crypto'

interface Params {
  [key: string]: string
}

export class InvalidParameterError extends Error {
  constructor(private innerParam: string, msg?: string) {
    super(msg)
  }

  get parameter() {
    return this.innerParam
  }
}

/**
 * Verify the given request as per Section 9.
 * @param params Collected parameters as per Section 9.1.1. Should contain Authorization header parameters, request body
 * parameters, and URL query parameters. Keys and values should be percent-encoded. `oauth_signature_method` should be
 * `'HMAC-SHA1'`. It should contain `oauth_signature`.
 * @param method HTTP method used for request.
 * @param requestUrl URL used for request.
 * @param consumerSecret OAuth 1.0a Consumer Secret.
 * @param @optional tokenSecret OAuth 1.0a Token Secret, if present.
 * @returns `true` if verification is successful, `false` otherwise.
 * @throws InvalidParameterError if `oauth_signature_method` is not `'HMAC-SHA1'`.
 * @throws InvalidParameterError if `oauth_signature` is not present.
 */
export default function verify(
  params: Params,
  method: string,
  requestUrl: string,
  consumerSecret: string,
  tokenSecret: string = '',
): boolean {
  if (params.oauth_signature_method !== 'HMAC-SHA1') {
    throw new InvalidParameterError('oauth_signature_method', 'oauth_signature_method should be HMAC-SHA1')
  }
  const oauthSignature = params.oauth_signature
  if (oauthSignature == null) {
    throw new InvalidParameterError('oauth_signature', 'oauth_signature must be present')
  }

  const processedParams = { ...params }
  delete processedParams.realm
  delete processedParams.oauth_signature

  const entries = Object.entries(processedParams)
  entries.sort((a, b) => {
    // Sort by key
    const x = a[0].localeCompare(b[0])
    if (x !== 0) {
      return x
    }
    // Sort by value
    return a[1].localeCompare(b[1])
  })

  const methodString = method.toUpperCase() // uppercase method
  const url = new URL(requestUrl)
  url.protocol = url.protocol.toLowerCase() // lowercase scheme
  url.hostname = url.hostname.toLowerCase() // lowercase authority
  url.search = '' // no query string
  // truncate trivial ports
  if ((url.protocol === 'https' && url.port === '443') || (url.protocol === 'http' && url.port === '80')) {
    url.port = ''
  }
  const requestUrlString = url.toString()
  const paramsString = entries.map(([k, v]) => `${k}=${v}`).join('&')

  const base =
    `${encodeURIComponent(methodString)}&${encodeURIComponent(requestUrlString)}&${encodeURIComponent(paramsString)}`
  const key =
    `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`
  const hmac = crypto.createHmac('sha1', key)
  hmac.update(base)
  const digest = hmac.digest()
  const calculatedSignature = digest.toString('base64')
  return oauthSignature === encodeURIComponent(calculatedSignature)
}
