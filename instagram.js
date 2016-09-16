'use strict'

// Module dependencies.
const url = require('url')
const got = require('got')
const qs = require('querystring')
const debug = require('debug')('insta:client')

/**
 * @constant
 * @type {string}
 * @default
 */

const AUTH_AUTHORIZATION_PATH = '/oauth/authorize'

/**
 * @constant
 * @type {string}
 * @default
 */

const AUTH_ACCESS_TOKEN_PATH = '/oauth/access_token'

/**
 * @constant
 * @type {string[]}
 * @default
 */

const AUTH_PARAMS = ['client_id', 'client_secret', 'access_token']

/**
 * Class representing Instagram client.
 */

class Instagram {
  /**
   * Create an instance.
   *
   * Authorization options can later be set
   * with call to {@link Instagram#setAuth}.
   *
   * @param {Object} [options] Instance options.
   * @param {string} [options.client_id] Client ID.
   * @param {string} [options.client_secret] Client Secret.
   * @param {string} [options.host=https://api.instagram.com] Instagram API endpoint.
   */

  constructor (options) {
    options || (options = {})
    this._host = options.host || 'https://api.instagram.com'
    this._auth = {}
    this.setAuth(options)
  }

  /**
   * Set authorization parameters.
   *
   * @param {Object} options Authorization parameters.
   * @param {string} [options.client_id] Client ID.
   * @param {string} [options.client_secret] Client Secret.
   *
   * @returns {Instagram} This instance.
   */

  setAuth (options) {
    AUTH_PARAMS.forEach((param) => {
      if (typeof options[param] !== 'undefined') {
        this._auth[param] = options[param]
      }
    })
    return this
  }

  /**
   * Get current authorization parameters.
   *
   * @returns {Object} Current authorization parameters.
   */

  getAuth () {
    return Object.assign({}, this._auth)
  }

  /**
   * Create request.
   *
   * @param {string} method HTTP method.
   * @param {string} path Resource path.
   * @param {Object} [options] Request options passed to
   *   [Got]{@link https://github.com/sindresorhus/got#goturl-options}
   *
   * @returns {Promise<Object>} A promise resolving to response object.
   */

  request (method, path, options) {
    options = Object.assign({
      method: method,
      path: path,
      json: true
    }, options)

    debug('request: %s, %j', this._host, options)

    return got(this._host, options)
  }

  /**
   * Generate authorization URL.
   *
   * For more information see
   * [Instagram Authentication]{@link https://www.instagram.com/developer/authentication/}.
   *
   * @param {string} redirectUri Redirect URI
   * @param {Object} [options] Additional query parameters.
   * @param {string} [options.state] Server specific state.
   * @param {string|string[]} [options.scope] Additional permissions outside
   *   of the "basic" permissions scope. See
   *   [Instagram Authorization]{@link https://www.instagram.com/developer/authorization/}
   *
   * @returns {string} An authorization URL.
   */

  getAuthorizationUrl (redirectUri, options) {
    if (!this._auth.client_id) {
      throw new Error('Authorization parameter `client_id` not set')
    }

    let params = Object.assign({
      client_id: this._auth.client_id,
      redirect_uri: redirectUri,
      response_type: 'code'
    }, options)

    if (Array.isArray(params.scope)) {
      params.scope = params.scope.join('+')
    }

    let urlObj = url.parse(this._host)
    urlObj.pathname = AUTH_AUTHORIZATION_PATH
    urlObj.query = params

    return url.format(urlObj)
  }

  /**
   * Exchange authorization code for access token.
   *
   * @param {string} code Authorization code received from service.
   * @param {string} redirectUri Redirect URI.
   *
   * @throws {Error}
   *
   * @returns {Promise<Object>} Response containing access token.
   */

  requestAccessToken (code, redirectUri) {
    if (!this._auth.client_id || !this._auth.client_secret) {
      throw new Error('Authorization parameters `client_id` and `client_secret` not set')
    }

    let params = {
      client_id: this._auth.client_id,
      client_secret: this._auth.client_secret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code
    }
    let body = qs.stringify(params)

    return this.request('POST', AUTH_ACCESS_TOKEN_PATH, {
      body: body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).then((res) => res.body)
  }
}

module.exports = Instagram
