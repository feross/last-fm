const get = require('simple-get')
const querystring = require('querystring')
const parallel = require('run-parallel')

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
      cb(null, data[name])
    }
  }

  _parseImage (image) {
    return image.map(i => i['#text']).filter(i => i.length > 0)
  }

  _parsePage (data) {
    return {
      totalResults: data['opensearch:totalResults'],
      startIndex: data['opensearch:startIndex'],
      itemsPerPage: data['opensearch:itemsPerPage']
    }
  }

  /**
   * CONVENIENCE API
   */

  search (opts, cb) {
    if (!opts.q) {
      return cb(new Error('Missing required param: q'))
    }
    const limit = opts.limit || 3
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
    }, (err, results) => {
      if (err) return cb(err)
      const exactMatch = []
        .concat(results.artists.results, results.tracks.results, results.albums.results)
        .filter(result => result.name.toLowerCase() === opts.q)[0]

      const top = []
        .concat(results.artists.results, results.tracks.results)
        .sort((a, b) => b.listeners - a.listeners)[0]

      if (exactMatch) {
        results.top = exactMatch
      } else {
        results.top = top
      }
      cb(null, results)
    })
  }

  /**
   * ALBUM API
   */

  albumGetInfo (opts, cb) {
    if (!opts.artist || !opts.album) {
      return cb(new Error('Missing required params: artist, album'))
    }
    Object.assign(opts, {
      method: 'album.getInfo',
      autocorrect: 1
    })
    this._sendRequest(opts, 'album', cb)
  }

  albumGetTopTags (opts, cb) {
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
      method: 'album.search',
      autocorrect: 1
    })
    this._sendRequest(opts, 'results', (err, data) => {
      if (err) return cb(err)
      const results = data.albummatches.album.map((album) => {
        return {
          name: album.name,
          artist: album.artist,
          images: this._parseImage(album.image),
          type: 'album'
        }
      })
      cb(null, Object.assign(this._parsePage(data), { results }))
    })
  }

  /**
   * ARTIST API
   */

  artistGetCorrection (opts, cb) {
    if (!opts.artist) {
      return cb(new Error('Missing required param: artist'))
    }
    opts.method = 'artist.getCorrection'
    this._sendRequest(opts, 'corrections', cb)
  }

  artistGetInfo (opts, cb) {
    if (!opts.artist) {
      return cb(new Error('Missing required param: artist'))
    }
    Object.assign(opts, {
      method: 'artist.getInfo',
      autocorrect: 1
    })
    this._sendRequest(opts, 'artist', cb)
  }

  artistGetSimilar (opts, cb) {
    if (!opts.artist) {
      return cb(new Error('Missing required param: artist'))
    }
    Object.assign(opts, {
      method: 'artist.getSimilar',
      autocorrect: 1
    })
    this._sendRequest(opts, 'similarartists', cb)
  }

  artistGetTopAlbums (opts, cb) {
    if (!opts.artist) {
      return cb(new Error('Missing required param: artist'))
    }
    Object.assign(opts, {
      method: 'artist.getTopAlbums',
      autocorrect: 1
    })
    this._sendRequest(opts, 'topalbums', cb)
  }

  artistGetTopTags (opts, cb) {
    if (!opts.artist) {
      return cb(new Error('Missing required param: artist'))
    }
    Object.assign(opts, {
      method: 'artist.getTopTags',
      autocorrect: 1
    })
    this._sendRequest(opts, 'toptags', cb)
  }

  artistGetTopTracks (opts, cb) {
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
      method: 'artist.search',
      autocorrect: 1
    })
    this._sendRequest(opts, 'results', (err, data) => {
      if (err) return cb(err)
      const results = data.artistmatches.artist.map((artist) => {
        return {
          name: artist.name,
          listeners: Number(artist.listeners),
          images: this._parseImage(artist.image),
          type: 'artist'
        }
      })
      cb(null, Object.assign(this._parsePage(data), { results }))
    })
  }

  /**
   * CHART API
   */

  chartGetTopArtists (opts, cb) {
    Object.assign(opts, {
      method: 'chart.getTopArtists',
      autocorrect: 1
    })
    this._sendRequest(opts, 'artists', cb)
  }

  chartGetTopTags (opts, cb) {
    Object.assign(opts, {
      method: 'chart.getTopTags',
      autocorrect: 1
    })
    this._sendRequest(opts, 'tags', cb)
  }

  chartGetTopTracks (opts, cb) {
    Object.assign(opts, {
      method: 'chart.getTopTracks',
      autocorrect: 1
    })
    this._sendRequest(opts, 'tracks', cb)
  }

  /**
   * GEO API
   */

  geoGetTopArtists (opts, cb) {
    if (!opts.country) {
      return cb(new Error('Missing required param: country'))
    }
    Object.assign(opts, {
      method: 'geo.getTopArtists',
      autocorrect: 1
    })
    this._sendRequest(opts, 'topartists', cb)
  }

  geoGetTopTracks (opts, cb) {
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

  tagGetInfo (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    opts.method = 'tag.getInfo'
    this._sendRequest(opts, 'tag', cb)
  }

  tagGetSimilar (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    opts.method = 'tag.getSimilar'
    this._sendRequest(opts, 'similartags', cb)
  }

  tagGetTopAlbums (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    opts.method = 'tag.getTopAlbums'
    this._sendRequest(opts, 'albums', cb)
  }

  tagGetTopArtists (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    opts.method = 'tag.getTopArtists'
    this._sendRequest(opts, 'topartists', cb)
  }

  tagGetTopTags (opts, cb) {
    opts.method = 'tag.getTopTags'
    this._sendRequest(opts, 'toptags', cb)
  }

  tagGetTopTracks (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    opts.method = 'tag.getTopTracks'
    this._sendRequest(opts, 'tracks', cb)
  }

  tagGetWeeklyChartList (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('Missing required param: tag'))
    }
    opts.method = 'tag.getWeeklyChartList'
    this._sendRequest(opts, 'weeklychartlist', cb)
  }

  /**
   * TRACK API
   */

  trackGetCorrection (opts, cb) {
    if (!opts.artist || !opts.track) {
      return cb(new Error('Missing required params: artist, track'))
    }
    opts.method = 'track.getCorrection'
    this._sendRequest(opts, 'corrections', cb)
  }

  trackGetInfo (opts, cb) {
    if (!opts.artist || !opts.track) {
      return cb(new Error('Missing required params: artist, track'))
    }
    Object.assign(opts, {
      method: 'track.getInfo',
      autocorrect: 1
    })
    this._sendRequest(opts, 'track', cb)
  }

  trackGetSimilar (opts, cb) {
    if (!opts.artist || !opts.track) {
      return cb(new Error('Missing required params: artist, track'))
    }
    Object.assign(opts, {
      method: 'track.getSimilar',
      autocorrect: 1
    })
    this._sendRequest(opts, 'similartracks', cb)
  }

  trackGetTopTags (opts, cb) {
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
      method: 'track.search',
      autocorrect: 1
    })
    this._sendRequest(opts, 'results', (err, data) => {
      if (err) return cb(err)
      const results = data.trackmatches.track.map((track) => {
        return {
          name: track.name,
          artist: track.artist,
          listeners: Number(track.listeners),
          images: this._parseImage(track.image),
          type: 'track'
        }
      })
      cb(null, Object.assign(this._parsePage(data), { results }))
    })
  }
}

module.exports = LastFM
