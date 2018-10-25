const get = require('simple-get')
const querystring = require('querystring')
const parallel = require('run-parallel')

const IMAGE_WEIGHT = {
  '': 1, // missing size is ranked last
  small: 2,
  medium: 3,
  large: 4,
  extralarge: 5,
  mega: 6
}

class LastFM {
  constructor (key, opts) {
    if (!key) throw new Error('Missing required `key` argument')
    if (!opts) opts = {}
    this._key = key
    this._userAgent = opts.userAgent || 'last-fm (https://github.com/feross/last-fm)'
    this._minArtistListeners = opts.minArtistListeners || 0
    this._minTrackListeners = opts.minTrackListeners || 0
  }

  _sendRequest (params, name, cb) {
    Object.assign(params, {
      api_key: this._key,
      format: 'json'
    })

    const urlBase = 'https://ws.audioscrobbler.com/2.0/'

    const opts = {
      url: urlBase + '?' + querystring.stringify(params),
      headers: {
        'User-Agent': this._userAgent
      },
      timeout: 30 * 1000,
      json: true
    }

    get.concat(opts, onResponse)

    function onResponse (err, res, data) {
      if (err) return cb(err)
      if (data.error) return cb(new Error(data.message))
      cb(null, data[name])
    }
  }

  /**
   * PARSE COMMON RESPONSE PROPERTIES
   */

  _parseImages (image) {
    return image
      .sort((a, b) => IMAGE_WEIGHT[a.size] - IMAGE_WEIGHT[b.size])
      .filter(image => image.size !== '')
      .map(image => image['#text'])
      .filter(image => image && image.length > 0)
  }

  _parseMeta (data, query) {
    if (data['opensearch:totalResults']) {
      const total = Number(data['opensearch:totalResults'])
      const perPage = Number(data['opensearch:itemsPerPage'])
      const page = (Number(data['opensearch:startIndex']) / perPage) + 1
      const totalPages = Math.ceil(total / perPage)
      return { query, page, perPage, total, totalPages }
    } else {
      return {
        query,
        page: Number(data['@attr'].page),
        perPage: Number(data['@attr'].perPage),
        total: Number(data['@attr'].total),
        totalPages: Number(data['@attr'].totalPages)
      }
    }
  }

  _parseSummary (summary) {
    return summary.replace(/\s+?<a .*?>Read more on Last\.fm<\/a>.*$/, '')
  }

  /**
   * PARSE COMMON RESPONSE TYPES
   */

  _parseArtists (artists) {
    return artists
      .map(artist => {
        return {
          type: 'artist',
          name: artist.name,
          listeners: Number(artist.listeners),
          images: this._parseImages(artist.image)
        }
      })
      .filter(artist => artist.listeners == null || artist.listeners >= this._minArtistListeners)
  }

  _parseAlbums (albums) {
    return albums
      .map(album => {
        return {
          type: 'album',
          name: album.name,
          artistName: album.artist.name || album.artist,
          listeners: (
            (album.playcount && Number(album.playcount)) ||
            (album.listeners && Number(album.listeners))
          ), // optional
          images: this._parseImages(album.image)
        }
      })
  }

  _parseTags (tags) {
    return tags.tag.map(t => t.name)
  }

  _parseTracks (tracks) {
    return tracks
      .map(track => {
        const listeners = track.playcount || track.listeners
        return {
          type: 'track',
          name: track.name,
          artistName: track.artist.name || track.artist,
          duration: track.duration && Number(track.duration), // optional
          listeners: listeners && Number(listeners), // optional
          images: track.image && this._parseImages(track.image) // optional
        }
      })
      .filter(track => track.listeners == null || track.listeners >= this._minTrackListeners)
  }

  /**
   * CONVENIENCE API
   */

  search (opts, cb) {
    if (!opts.q) {
      return cb(new Error('Missing required param: q'))
    }
    parallel({
      artists: cb => {
        this.artistSearch({ q: opts.q, limit: opts.artistsLimit || opts.limit }, cb)
      },
      tracks: cb => {
        this.trackSearch({ q: opts.q, limit: opts.tracksLimit || opts.limit }, cb)
      },
      albums: cb => {
        this.albumSearch({ q: opts.q, limit: opts.albumsLimit || opts.limit }, cb)
      }
    }, (err, r) => {
      if (err) return cb(err)

      const page = r.artists.meta.page
      const total = r.artists.meta.total + r.tracks.meta.total + r.albums.meta.total
      const perPage = r.artists.meta.perPage * 3
      const totalPages = Math.ceil(total / perPage)

      const result = {
        meta: { query: opts, page, perPage, total, totalPages },
        result: {
          type: 'search',
          q: opts.q,
          artists: r.artists.result,
          tracks: r.tracks.result,
          albums: r.albums.result
        }
      }

      // Prefer an exact match
      const exactMatch = []
        .concat(result.result.artists, result.result.tracks, result.result.albums)
        .filter(result => result.name.toLowerCase() === opts.q)
        .sort((a, b) => (b.listeners || 0) - (a.listeners || 0))[0]

      // Otherwise, use most popular result by listener count. Albums don't have listener count.
      const top = []
        .concat(result.result.artists, result.result.tracks)
        .sort((a, b) => b.listeners - a.listeners)[0]

      result.result.top = exactMatch || top || null

      cb(null, result)
    })
  }

  /**
   * ALBUM API
   */

  albumInfo (opts, cb) {
    if (!opts.name || !opts.artistName) {
      return cb(new Error('Missing required params: name, artistName'))
    }
    const params = {
      method: 'album.getInfo',
      album: opts.name,
      artist: opts.artistName,
      autocorrect: 1
    }
    this._sendRequest(params, 'album', (err, album) => {
      if (err) return cb(err)
      cb(null, {
        type: 'album',
        name: album.name,
        artistName: album.artist,
        images: this._parseImages(album.image),
        listeners: Number(album.playcount) || Number(album.listeners),
        tracks: this._parseTracks(album.tracks.track),
        tags: this._parseTags(album.tags),
        summary: album.wiki && this._parseSummary(album.wiki.content)
      })
    })
  }

  albumTopTags (opts, cb) {
    if (!opts.name || !opts.artistName) {
      return cb(new Error('Missing required params: name, artistName'))
    }
    const params = {
      method: 'album.getTopTags',
      album: opts.name,
      artist: opts.artistName,
      autocorrect: 1
    }
    this._sendRequest(params, 'toptags', cb)
  }

  albumSearch (opts, cb) {
    if (!opts.q) {
      return cb(new Error('Missing required param: q'))
    }
    const params = {
      method: 'album.search',
      limit: opts.limit,
      page: opts.page,
      album: opts.q
    }
    this._sendRequest(params, 'results', (err, data) => {
      if (err) return cb(err)
      cb(null, {
        meta: this._parseMeta(data, opts),
        result: this._parseAlbums(data.albummatches.album)
      })
    })
  }

  /**
   * ARTIST API
   */

  artistCorrection (opts, cb) {
    if (!opts.name) {
      return cb(new Error('Missing required param: name'))
    }
    const params = {
      method: 'artist.getCorrection',
      artist: opts.name
    }
    this._sendRequest(params, 'corrections', (err, data) => {
      if (err) return cb(err)
      const correction = data.correction
      cb(null, {
        name: correction.artist.name
      })
    })
  }

  artistInfo (opts, cb) {
    if (!opts.name) {
      return cb(new Error('Missing required param: name'))
    }
    const params = {
      method: 'artist.getInfo',
      artist: opts.name,
      autocorrect: 1
    }
    this._sendRequest(params, 'artist', (err, artist) => {
      if (err) return cb(err)
      const similar = artist.similar.artist.map(similarArtist => {
        return {
          type: 'artist',
          name: similarArtist.name,
          images: this._parseImages(similarArtist.image)
        }
      })
      cb(null, {
        type: 'artist',
        name: artist.name,
        listeners: Number(artist.stats.listeners),
        images: this._parseImages(artist.image),
        tags: this._parseTags(artist.tags),
        summary: this._parseSummary(artist.bio.content),
        similar
      })
    })
  }

  artistSimilar (opts, cb) {
    if (!opts.name) {
      return cb(new Error('Missing required param: name'))
    }
    const params = {
      method: 'artist.getSimilar',
      artist: opts.name,
      limit: opts.limit,
      autocorrect: 1
    }
    this._sendRequest(params, 'similarartists', cb)
  }

  artistTopAlbums (opts, cb) {
    if (!opts.name) {
      return cb(new Error('Missing required param: name'))
    }
    const params = {
      method: 'artist.getTopAlbums',
      artist: opts.name,
      limit: opts.limit,
      autocorrect: 1
    }
    this._sendRequest(params, 'topalbums', (err, data) => {
      if (err) return cb(err)
      cb(null, {
        meta: this._parseMeta(data, opts),
        result: this._parseAlbums(data.album)
      })
    })
  }

  artistTopTags (opts, cb) {
    if (!opts.name) {
      return cb(new Error('Missing required param: name'))
    }
    const params = {
      method: 'artist.getTopTags',
      artist: opts.name,
      autocorrect: 1
    }
    this._sendRequest(params, 'toptags', cb)
  }

  artistTopTracks (opts, cb) {
    if (!opts.name) {
      return cb(new Error('Missing required param: name'))
    }
    const params = {
      method: 'artist.getTopTracks',
      artist: opts.name,
      limit: opts.limit,
      autocorrect: 1
    }
    this._sendRequest(params, 'toptracks', (err, data) => {
      if (err) return cb(err)
      cb(null, {
        meta: this._parseMeta(data, opts),
        result: this._parseTracks(data.track)
      })
    })
  }

  artistSearch (opts, cb) {
    if (!opts.q) {
      return cb(new Error('Missing required param: q'))
    }
    const params = {
      method: 'artist.search',
      limit: opts.limit,
      page: opts.page,
      artist: opts.q
    }
    this._sendRequest(params, 'results', (err, data) => {
      if (err) return cb(err)
      cb(null, {
        meta: this._parseMeta(data, opts),
        result: this._parseArtists(data.artistmatches.artist)
      })
    })
  }

  /**
   * CHART API
   */

  chartTopArtists (opts, cb) {
    const params = {
      method: 'chart.getTopArtists',
      limit: opts.limit,
      page: opts.page,
      autocorrect: 1
    }
    this._sendRequest(params, 'artists', (err, data) => {
      if (err) return cb(err)
      cb(null, {
        meta: this._parseMeta(data, opts),
        result: this._parseArtists(data.artist)
      })
    })
  }

  chartTopTags (opts, cb) {
    const params = {
      method: 'chart.getTopTags',
      limit: opts.limit,
      page: opts.page,
      autocorrect: 1
    }
    this._sendRequest(params, 'tags', cb)
  }

  chartTopTracks (opts, cb) {
    const params = {
      method: 'chart.getTopTracks',
      limit: opts.limit,
      page: opts.page,
      autocorrect: 1
    }
    this._sendRequest(params, 'tracks', (err, data) => {
      if (err) return cb(err)
      cb(null, {
        meta: this._parseMeta(data, opts),
        result: this._parseTracks(data.track)
      })
    })
  }

  /**
   * GEO API
   */

  geoTopArtists (opts, cb) {
    if (!opts.country) {
      return cb(new Error('Missing required param: country'))
    }
    const params = {
      method: 'geo.getTopArtists',
      country: opts.country,
      limit: opts.limit,
      page: opts.page,
      autocorrect: 1
    }
    this._sendRequest(params, 'topartists', cb)
  }

  geoTopTracks (opts, cb) {
    if (!opts.country) {
      return cb(new Error('Missing required param: country'))
    }
    const params = {
      method: 'geo.getTopTracks',
      country: opts.country,
      limit: opts.limit,
      page: opts.page,
      autocorrect: 1
    }
    this._sendRequest(params, 'tracks', cb)
  }

  /**
   * TAG API
   */

  tagInfo (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    const params = {
      method: 'tag.getInfo',
      tag: opts.tag
    }
    this._sendRequest(params, 'tag', cb)
  }

  tagSimilar (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    const params = {
      method: 'tag.getSimilar',
      tag: opts.tag
    }
    this._sendRequest(params, 'similartags', cb)
  }

  tagTopAlbums (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    const params = {
      method: 'tag.getTopAlbums',
      limit: opts.limit,
      page: opts.page,
      tag: opts.tag
    }
    this._sendRequest(params, 'albums', cb)
  }

  tagTopArtists (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    const params = {
      method: 'tag.getTopArtists',
      limit: opts.limit,
      page: opts.page,
      tag: opts.tag
    }
    this._sendRequest(params, 'topartists', cb)
  }

  tagTopTags (opts, cb) {
    const params = {
      method: 'tag.getTopTags'
    }
    this._sendRequest(params, 'toptags', cb)
  }

  tagTopTracks (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    const params = {
      method: 'tag.getTopTracks',
      limit: opts.limit,
      page: opts.page,
      tag: opts.tag
    }
    this._sendRequest(params, 'tracks', cb)
  }

  /**
   * TRACK API
   */

  trackCorrection (opts, cb) {
    if (!opts.name || !opts.artistName) {
      return cb(new Error('Missing required params: name, artistName'))
    }
    const params = {
      method: 'track.getCorrection',
      track: opts.name,
      artist: opts.artistName
    }
    this._sendRequest(params, 'corrections', (err, data) => {
      if (err) return cb(err)
      cb(null, {
        name: data.correction.track.name,
        artistName: data.correction.track.artist.name
      })
    })
  }

  trackInfo (opts, cb) {
    if (!opts.name || !opts.artistName) {
      return cb(new Error('Missing required params: name, artistName'))
    }
    const params = {
      method: 'track.getInfo',
      track: opts.name,
      artist: opts.artistName,
      autocorrect: 1
    }
    this._sendRequest(params, 'track', (err, track) => {
      if (err) return cb(err)
      cb(null, {
        type: 'track',
        name: track.name,
        artistName: track.artist.name,
        albumName: track.album && track.album.title,
        listeners: Number(track.listeners),
        duration: Math.ceil(track.duration / 1000),
        images: track.album && this._parseImages(track.album.image),
        tags: this._parseTags(track.toptags)
      })
    })
  }

  trackSimilar (opts, cb) {
    if (!opts.name || !opts.artistName) {
      return cb(new Error('Missing required params: name, artistName'))
    }
    const params = {
      method: 'track.getSimilar',
      track: opts.name,
      artist: opts.artistName,
      limit: opts.limit,
      autocorrect: 1
    }
    this._sendRequest(params, 'similartracks', cb)
  }

  trackTopTags (opts, cb) {
    if (!opts.name || !opts.artistName) {
      return cb(new Error('Missing required params: name, artistName'))
    }
    const params = {
      method: 'track.getTopTags',
      track: opts.name,
      artist: opts.artistName,
      autocorrect: 1
    }
    this._sendRequest(params, 'toptags', cb)
  }

  trackSearch (opts, cb) {
    if (!opts.q) {
      return cb(new Error('Missing required param: q'))
    }
    const params = {
      method: 'track.search',
      limit: opts.limit,
      page: opts.page,
      track: opts.q
    }
    this._sendRequest(params, 'results', (err, data) => {
      if (err) return cb(err)
      cb(null, {
        meta: this._parseMeta(data, opts),
        result: this._parseTracks(data.trackmatches.track)
      })
    })
  }
}

module.exports = LastFM
