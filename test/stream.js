'use strict'
/* eslint-env mocha */

// Module dependencies.
const InstagramStream = require('../stream')
const Readable = require('stream').Readable
const nock = require('nock')

let stream

describe('InstagramStream', () => {
  beforeEach(() => (stream = new InstagramStream()))

  describe('#constructor()', () => {
    it('should be instance of Readable class', () => {
      stream.should.be.instanceOf(InstagramStream)
      stream.should.be.instanceOf(Readable)
    })
  })

  describe('#track()', () => {
    it('should be able to add single tag', () => {
      stream.track('test')
      stream.tracking().should.be.an.Array().and.be.eql(['test'])
    })

    it('should be able to add multiple tags at once', () => {
      stream.track(['test1', 'test2'])
      stream.tracking().should.be.an.Array().and.be.eql(['test1', 'test2'])
    })
  })

  describe('#untrack()', () => {
    beforeEach(() => stream.track(['test1', 'test2']))

    it('should be able to remove single tag', () => {
      stream.untrack('test1')
      stream.tracking().should.be.an.Array().and.be.eql(['test2'])
    })

    it('should ignore tag removal when tag is not tracked', () => {
      stream.untrack('test1')
      stream.tracking().should.be.an.Array().and.be.eql(['test2'])
    })

    it('should be able to remove multiple tags', () => {
      stream.untrack(['test1', 'test2'])
      stream.tracking().should.be.an.Array().and.be.eql([])
    })
  })

  describe('#tracking()', () => {
    it('should return list of currently tracked tags', () => {
      stream.tracking().should.be.an.Array().and.be.eql([])
    })
  })

  describe('stream', () => {
    it('should emit data events', (done) => {
      let response = require('./mock/tags_nature_media_recent.json')
      let auth = { client_id: 'foo', client_secret: 'bar', access_token: 'baz' }
      stream.client.setAuth(auth)
      stream.setAccessToken(auth.access_token)

      nock('https://api.instagram.com')
        .get('/v1/tags/nature/media/recent')
        .query({
          access_token: auth.access_token,
          count: 50
        })
        .reply(200, response, {
          'x-ratelimit-remaining': '4996',
          'x-ratelimit-limit': '5000',
          'content-type': 'application/json; charset=utf-8'
        })

      stream.once('data', (data) => {
        data.should.be.eql(response.data[0])
        done()
      })

      stream.track('nature', auth.access_token)
    })
  })
})
