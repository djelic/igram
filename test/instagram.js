'use strict'
/* eslint-env mocha */

// Module dependencies.
const Instagram = require('..')
const nock = require('nock')

let instagram

describe('Instagram', () => {
  beforeEach(() => (instagram = new Instagram()))

  describe('#constructor()', () => {
    it('should be instance of Instagram class', () => {
      instagram.should.be.instanceOf(Instagram)
    })

    it('should be able to set auth during instantiation', () => {
      let opts = {
        client_id: 'abc',
        client_secret: 'def',
        access_token: 'ghi'
      }
      instagram = new Instagram(opts)
      instagram.getAuth().should.be.eql(opts)
    })
  })

  describe('#getAuth()', () => {
    it('should be able to get auth', () => {
      instagram.getAuth().should.be.eql({})
    })
  })

  describe('#setAuth()', () => {
    it('should be able to set auth', () => {
      let auth = {
        client_id: 'foo',
        client_secret: 'bar'
      }
      instagram.setAuth(auth)
      instagram.getAuth().should.be.eql(auth)
    })
  })

  describe('#getAuthorizationUrl()', () => {
    it('should throw an error if client_id not set', () => {
      (() => instagram.getAuthorizationUrl()).should.throw(/authorization parameter `client_id` not set/i)
    })

    it('should be able to generate authorization url', () => {
      instagram.setAuth({ client_id: 'abc' })
      let redirectUri = 'http://foo'
      let expected = 'https://api.instagram.com/oauth/authorize'
      expected += '?client_id=abc'
      expected += `&redirect_uri=${encodeURIComponent(redirectUri)}`
      expected += `&response_type=code`
      instagram.getAuthorizationUrl(redirectUri).should.be.equal(expected)
    })

    it('should be able to generate authrization url with additional params', () => {
      instagram.setAuth({ client_id: 'abc' })
      let redirectUri = 'http://foo'
      let options = { scope: ['basic', 'likes'], state: 'test' }
      let expected = 'https://api.instagram.com/oauth/authorize'
      expected += '?client_id=abc'
      expected += `&redirect_uri=${encodeURIComponent(redirectUri)}`
      expected += `&response_type=code`
      expected += `&scope=${encodeURIComponent(options.scope.join('+'))}`
      expected += `&state=${encodeURIComponent(options.state)}`
      instagram.getAuthorizationUrl(redirectUri, options).should.be.equal(expected)
    })
  })

  describe('#requestAccessToken()', () => {
    it('should be able to request access token', () => {
      let code = 'abc123'
      let redirectUri = 'http://foo'
      let auth = { client_id: 'foo', client_secret: 'bar' }
      let response = {
        access_token: 'token123',
        user: {
          id: '1234',
          username: 'username',
          full_name: 'User Name',
          website: 'http://example.com',
          profile_picture: 'http://example.com/image.png',
          bio: ''
        }
      }
      instagram.setAuth(auth)

      nock('https://api.instagram.com')
        .post('/oauth/access_token', `client_id=${auth.client_id}&client_secret=${auth.client_secret}&grant_type=authorization_code&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`)
        .reply(200, response, {
          'Content-Type': 'application/json'
        })

      return instagram.requestAccessToken(code, redirectUri)
        .then((token) => {
          token.access_token.should.be.equal(response.access_token)
          token.user.should.be.eql(response.user)
        })
    })
  })

  describe('#request()', () => {
    it('should be able to build request', () => {
      let auth = { client_id: 'foo', client_secret: 'bar', access_token: 'baz' }
      let response = require('./mock/tags_nature_media_recent.json')
      instagram.setAuth(auth)

      nock('https://api.instagram.com')
        .get('/v1/tags/nature/media/recent')
        .query({
          access_token: auth.access_token
        })
        .reply(200, response, {
          'x-ratelimit-remaining': '4996',
          'x-ratelimit-limit': '5000',
          'content-type': 'application/json; charset=utf-8'
        })

      return instagram.request('GET', '/v1/tags/nature/media/recent', {
        query: { access_token: auth.access_token }
      }).then((res) => {
        res.body.should.be.eql(response)
      })
    })
  })
})
