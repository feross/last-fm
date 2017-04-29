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
  constructor (key, userAgent) {
    if (!key) throw new Error('Missing required `key` argument')
    this._key = key
    this._userAgent = userAgent || 'LastFM'
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

  _parseImages (image) {
    return image
      .sort((a, b) => IMAGE_WEIGHT[b.size] - IMAGE_WEIGHT[a.size])
      .map(i => i['#text'])
      .filter(i => i.length > 0)
  }

  _parseMeta (data) {
    const perPage = Number(data['opensearch:itemsPerPage'])
    const total = Number(data['opensearch:totalResults'])
    const page = (data['opensearch:startIndex'] / perPage) + 1
    const totalPages = Math.ceil(total / perPage)
    return {
      page: page,
      perPage: perPage,
      totalPages: totalPages,
      total: total
    }
  }

  _parseTags (tags) {
    return tags.tag.map(t => t.name)
  }

  _parseSummary (summary) {
    return summary.replace(/\s+?<a .*?>Read more on Last\.fm<\/a>.*$/, '')
  }

  /**
   * CONVENIENCE API
   */

  search (opts, cb) {
    if (!opts.q) {
      return cb(new Error('Missing required param: q'))
    }
    const limit = opts.limit || 10
    parallel({
      artists: (cb) => {
        this.artistSearch({ artist: opts.q, limit }, cb)
      },
      tracks: (cb) => {
        this.trackSearch({ track: opts.q, limit }, cb)
      },
      albums: (cb) => {
        this.albumSearch({ album: opts.q, limit }, cb)
      }
    }, (err, r) => {
      if (err) return cb(err)

      const result = {
        artists: r.artists.result,
        tracks: r.tracks.result,
        albums: r.albums.result
      }

      // Prefer an exact match
      const exactMatch = []
        .concat(result.artists, result.tracks, result.albums)
        .filter(result => result.name.toLowerCase() === opts.q)
        .sort((a, b) => (b.listeners || 0) - (a.listeners || 0))[0]

      // Otherwise, use most popular result by listener count. Albums don't have listener count.
      const top = []
        .concat(result.artists, result.tracks)
        .sort((a, b) => b.listeners - a.listeners)[0]

      result.top = exactMatch || top || null

      cb(null, result)
    })
  }

  /**
   * ALBUM API
   */

  albumInfo (opts, cb) {
    if (!opts.artist || !opts.album) {
      return cb(new Error('Missing required params: artist, album'))
    }
    Object.assign(opts, {
      method: 'album.getInfo',
      autocorrect: 1
    })
    this._sendRequest(opts, 'album', (err, album) => {
      if (err) return cb(err)
      const tracks = album.tracks.track.map(track => {
        return {
          type: 'track',
          name: track.name,
          artist: track.artist.name,
          duration: track.duration
        }
      })
      cb(null, {
        type: 'album',
        name: album.name,
        artist: album.artist,
        images: this._parseImages(album.image),
        listeners: Number(album.listeners),
        tracks,
        tags: this._parseTags(album.tags),
        summary: this._parseSummary(album.wiki.content)
      })
    })
  }

  albumTopTags (opts, cb) {
    if (!opts.artist || !opts.album) {
      return cb(new Error('Missing required params: artist, album'))
    }
    Object.assign(opts, {
      method: 'album.getTopTags',
      autocorrect: 1
    })
    this._sendRequest(opts, 'toptags', cb)
  }

  albumSearch (opts, cb) {
    if (!opts.album) {
      return cb(new Error('Missing required param: album'))
    }
    Object.assign(opts, {
      method: 'album.search'
    })
    this._sendRequest(opts, 'results', (err, data) => {
      if (err) return cb(err)
      const result = data.albummatches.album.map((album) => {
        return {
          type: 'album',
          name: album.name,
          artist: album.artist,
          images: this._parseImages(album.image)
        }
      })
      cb(null, { result, meta: this._parseMeta(data) })
    })
  }

  /**
   * ARTIST API
   */

  artistCorrection (opts, cb) {
    if (!opts.artist) {
      return cb(new Error('Missing required param: artist'))
    }
    opts.method = 'artist.getCorrection'
    this._sendRequest(opts, 'corrections', (err, data) => {
      if (err) return cb(err)
      const correction = data.correction
      cb(null, {
        name: correction.artist.name
      })
    })
  }

  artistInfo (opts, cb) {
    if (!opts.artist) {
      return cb(new Error('Missing required param: artist'))
    }
    Object.assign(opts, {
      method: 'artist.getInfo',
      autocorrect: 1
    })
    this._sendRequest(opts, 'artist', (err, artist) => {
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
    if (!opts.artist) {
      return cb(new Error('Missing required param: artist'))
    }
    Object.assign(opts, {
      method: 'artist.getSimilar',
      autocorrect: 1
    })
    this._sendRequest(opts, 'similarartists', cb)
  }

  artistTopAlbums (opts, cb) {
    if (!opts.artist) {
      return cb(new Error('Missing required param: artist'))
    }
    Object.assign(opts, {
      method: 'artist.getTopAlbums',
      autocorrect: 1
    })
    this._sendRequest(opts, 'topalbums', cb)
  }

  artistTopTags (opts, cb) {
    if (!opts.artist) {
      return cb(new Error('Missing required param: artist'))
    }
    Object.assign(opts, {
      method: 'artist.getTopTags',
      autocorrect: 1
    })
    this._sendRequest(opts, 'toptags', cb)
  }

  artistTopTracks (opts, cb) {
    if (!opts.artist) {
      return cb(new Error('Missing required param: artist'))
    }
    Object.assign(opts, {
      method: 'artist.getTopTracks',
      autocorrect: 1
    })
    this._sendRequest(opts, 'toptracks', cb)
  }

  artistSearch (opts, cb) {
    if (!opts.artist) {
      return cb(new Error('Missing required param: artist'))
    }
    Object.assign(opts, {
      method: 'artist.search'
    })
    this._sendRequest(opts, 'results', (err, data) => {
      if (err) return cb(err)
      const result = data.artistmatches.artist.map((artist) => {
        return {
          type: 'artist',
          name: artist.name,
          listeners: Number(artist.listeners),
          images: this._parseImages(artist.image)
        }
      })
      cb(null, { result, meta: this._parseMeta(data) })
    })
  }

  /**
   * CHART API
   */

  chartTopArtists (opts, cb) {
    Object.assign(opts, {
      method: 'chart.getTopArtists',
      autocorrect: 1
    })
    this._sendRequest(opts, 'artists', cb)
  }

  chartTopTags (opts, cb) {
    Object.assign(opts, {
      method: 'chart.getTopTags',
      autocorrect: 1
    })
    this._sendRequest(opts, 'tags', cb)
  }

  chartTopTracks (opts, cb) {
    Object.assign(opts, {
      method: 'chart.getTopTracks',
      autocorrect: 1
    })
    this._sendRequest(opts, 'tracks', cb)
  }

  /**
   * GEO API
   */

  geoTopArtists (opts, cb) {
    if (!opts.country) {
      return cb(new Error('Missing required param: country'))
    }
    Object.assign(opts, {
      method: 'geo.getTopArtists',
      autocorrect: 1
    })
    this._sendRequest(opts, 'topartists', cb)
  }

  geoTopTracks (opts, cb) {
    if (!opts.country) {
      return cb(new Error('Missing required param: country'))
    }
    Object.assign(opts, {
      method: 'geo.getTopTracks',
      autocorrect: 1
    })
    this._sendRequest(opts, 'tracks', cb)
  }

  /**
   * TAG API
   */

  tagInfo (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    opts.method = 'tag.getInfo'
    this._sendRequest(opts, 'tag', cb)
  }

  tagSimilar (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    opts.method = 'tag.getSimilar'
    this._sendRequest(opts, 'similartags', cb)
  }

  tagTopAlbums (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    opts.method = 'tag.getTopAlbums'
    this._sendRequest(opts, 'albums', cb)
  }

  tagTopArtists (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    opts.method = 'tag.getTopArtists'
    this._sendRequest(opts, 'topartists', cb)
  }

  tagTopTags (opts, cb) {
    opts.method = 'tag.getTopTags'
    this._sendRequest(opts, 'toptags', cb)
  }

  tagTopTracks (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    opts.method = 'tag.getTopTracks'
    this._sendRequest(opts, 'tracks', cb)
  }

  tagWeeklyChartList (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    opts.method = 'tag.getWeeklyChartList'
    this._sendRequest(opts, 'weeklychartlist', cb)
  }

  /**
   * TRACK API
   */

  trackCorrection (opts, cb) {
    if (!opts.artist || !opts.track) {
      return cb(new Error('Missing required params: artist, track'))
    }
    opts.method = 'track.getCorrection'
    this._sendRequest(opts, 'corrections', (err, data) => {
      if (err) return cb(err)
      const correction = data.correction
      cb(null, {
        name: correction.track.name,
        artist: correction.track.artist.name
      })
    })
  }

  trackInfo (opts, cb) {
    if (!opts.artist || !opts.track) {
      return cb(new Error('Missing required params: artist, track'))
    }
    Object.assign(opts, {
      method: 'track.getInfo',
      autocorrect: 1
    })
    this._sendRequest(opts, 'track', (err, track) => {
      if (err) return cb(err)
      cb(null, {
        type: 'track',
        name: track.name,
        artist: track.artist.name,
        album: track.album.title,
        listeners: Number(track.listeners),
        duration: Math.ceil(track.duration / 1000),
        images: this._parseImages(track.album.image),
        tags: this._parseTags(track.toptags)
      })
    })
  }

  trackSimilar (opts, cb) {
    if (!opts.artist || !opts.track) {
      return cb(new Error('Missing required params: artist, track'))
    }
    Object.assign(opts, {
      method: 'track.getSimilar',
      autocorrect: 1
    })
    this._sendRequest(opts, 'similartracks', cb)
  }

  trackTopTags (opts, cb) {
    if (!opts.artist || !opts.track) {
      return cb(new Error('Missing required params: artist, track'))
    }
    Object.assign(opts, {
      method: 'track.getTopTags',
      autocorrect: 1
    })
    this._sendRequest(opts, 'toptags', cb)
  }

  trackSearch (opts, cb) {
    if (!opts.track) {
      return cb(new Error('Missing required param: track'))
    }
    Object.assign(opts, {
      method: 'track.search'
    })
    this._sendRequest(opts, 'results', (err, data) => {
      if (err) return cb(err)
      const result = data.trackmatches.track.map((track) => {
        return {
          type: 'track',
          name: track.name,
          artist: track.artist,
          listeners: Number(track.listeners),
          images: this._parseImages(track.image)
        }
      })
      cb(null, { result, meta: this._parseMeta(data) })
    })
  }
}

module.exports = LastFM
