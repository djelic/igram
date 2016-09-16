'use strict'

// Module dependencies.
const Instagram = require('./instagram')
const Readable = require('stream').Readable

const FILTER_TYPE_TAG = 'tag'
const FILTER_TYPE_USER = 'user'

const FILTER_PATH_MAP = {
  [FILTER_TYPE_TAG]: '/v1/tags/:key/media/recent',
  [FILTER_TYPE_USER]: '/v1/users/:key/media/recent'
}

/**
 * Class representing Instagram stream.
 */

class InstagramStream extends Readable {
  /**
   * Create an instance.
   *
   * Authorization options are passed to
   * underlying Instagram client.
   *
   * @param {Object} [options] Instance options.
   * @param {string} [options.client_id] Client ID.
   * @param {string} [options.client_secret] Client Secret.
   */

  constructor (options) {
    options || (options = {})
    super({ objectMode: true })

    this._client = options.client || new Instagram(options)

    this._filters = {
      [FILTER_TYPE_TAG]: {},
      [FILTER_TYPE_USER]: {}
    }

    this.timer = null
    this.fetching = false
    this.fetchFilterType = 0
  }

  /**
   * Instance of {@link Instagram} that serves
   * as underlying source of data.
   */

  get client () {
    return this._client
  }

  /**
   * `true` if currently fetching data from underlying
   * source or if request is scheduled, `false` otherwise.
   */

  get isRunning () {
    return !!(this.timer || this.fetching)
  }

  /**
   * `true` if there is tracks set up, `false` otherwise.
   */

  get isEmpty () {
    return !this.tracking().length &&
           !this.following().length
  }

  /**
   * Track tag.
   *
   * @param {string} tag Tag name.
   * @param {string} [accessToken] Optional user access token.
   *
   * @returns {InstagramStream} This instance.
   */

  track (tag, accessToken) {
    this._addFilter(FILTER_TYPE_TAG, tag, accessToken)
    return this
  }

  /**
   * Untrack tag.
   *
   * @param {string} tag Tag name.
   *
   * @returns {InstagramStream} This instance.
   */

  untrack (tag) {
    this._removeFilter(FILTER_TYPE_TAG, tag)
    return this
  }

  /**
   * Follow user.
   *
   * @param {string} userId User ID.
   * @param {string} [accessToken] Optional user access token.
   *
   * @returns {InstagramStream} This instance.
   */

  follow (userId, accessToken) {
    this._addFilter(FILTER_TYPE_USER, userId, accessToken)
    return this
  }

  /**
   * Unfollow user.
   *
   * @param {string} userId User ID.
   *
   * @returns {InstagramStream} This instance.
   */

  unfollow (userId) {
    this._removeFilter(FILTER_TYPE_USER, userId)
    return this
  }

  /**
   * Get currently tracked tags.
   *
   * @returns {string[]} List of tags.
   */

  tracking () {
    return Object.keys(this._filters[FILTER_TYPE_TAG])
  }

  /**
   * Get currently tracked users.
   *
   * @returns {string[]} List of user IDs.
   */

  following () {
    return Object.keys(this._filters[FILTER_TYPE_USER])
  }

  _read (size) {
    if (this.isRunning || this.isEmpty) return
    this._fetch()
  }

  _fetch () {
    this.fetching = true

    let filterTypes = Object.keys(this._filters)
    this.fetchFilterType = ++this.fetchFilterType % filterTypes.length
    let filterType = filterTypes[this.fetchFilterType]
    let filters = this._filters[filterType]
    let key = Object.keys(filters)
      .sort((a, b) => filters[a].lastUpdate - filters[b].lastUpdate)
      .shift()

    if (!key) return this._fetch()
    let options = filters[key]

    let path = FILTER_PATH_MAP[filterType].replace(':key', encodeURIComponent(key))
    let token = options.accessTokens.shift()
    options.accessTokens.push(token)

    this._client.request('GET', path, {
      query: {
        access_token: token,
        count: 50
      }
    }).then((res) => {
      options.lastUpdate = Date.now()

      res.body.data
        .filter((post) => !~options.lastPostIds.indexOf(post.id))
        .forEach((data) => {
          options.lastPostIds.push(data.id)
          this.push(data)
        })

      options.lastPostIds = options.lastPostIds.splice(-50)
    }).catch((err) => {
      this.emit('error', err)
    }).then(() => {
      this._scheduleFetch()
      this.fetching = false
    })
  }

  _scheduleFetch () {
    this.timer = setTimeout(() => {
      this._clearTimer()
      this._fetch()
    }, 720)
  }

  _clearTimer () {
    clearTimeout(this.timer)
    this.timer = null
  }

  _addFilter (filter, tags, accessToken) {
    if (!Array.isArray(tags)) {
      tags = [tags]
    }

    tags.forEach((tag) => {
      if (!this._filters[filter][tag]) {
        this._filters[filter][tag] = {
          count: 0,
          lastUpdate: 0,
          lastPostIds: [],
          accessTokens: []
        }
      }
      this._filters[filter][tag].count++
      if (accessToken) {
        this._filters[filter][tag].accessTokens.push(accessToken)
      }
    })

    if (!this.isRunning) {
      this._fetch()
    }
  }

  _removeFilter (filter, tags) {
    if (!Array.isArray(tags)) {
      tags = [tags]
    }

    tags.forEach((tag) => {
      if (!this._filters[filter][tag]) return
      if (--this._filters[filter][tag].count === 0) {
        delete this._filters[filter][tag]
      }
    })

    if (this.isEmpty && this.isRunning) {
      this._clearTimer()
    }
  }
}

module.exports = InstagramStream
