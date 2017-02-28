const get = require('simple-get')
const querystring = require('querystring')

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

  albumGetInfo (opts, cb) {
    if ((!opts.artist || !opts.album) && !opts.mbid) {
      return cb(new Error('Missing required params'))
    }
    Object.assign(opts, {
      method: 'album.getInfo',
      autocorrect: 1
    })
    this._sendRequest(opts, 'album', cb)
  }

  albumGetTopTags (opts, cb) {
    if ((!opts.artist || !opts.album) && !opts.mbid) {
      return cb(new Error('Missing required params'))
    }
    Object.assign(opts, {
      method: 'album.getTopTags',
      autocorrect: 1
    })
    this._sendRequest(opts, 'toptags', cb)
  }

  albumSearch (opts, cb) {
    if (!opts.album) {
      return cb(new Error('Missing album param'))
    }
    Object.assign(opts, {
      method: 'album.search',
      autocorrect: 1
    })
    this._sendRequest(opts, 'results', cb)
  }

  artistGetCorrection (opts, cb) {
    if (!opts.artist) {
      return cb(new Error('Missing Artist'))
    }
    opts.method = 'artist.getCorrection'
    this._sendRequest(opts, 'corrections', cb)
  }

  artistGetInfo (opts, cb) {
    if (!opts.artist && !opts.mbid) {
      return cb(new Error('Missing both artist and mbid'))
    }
    Object.assign(opts, {
      method: 'artist.getInfo',
      autocorrect: 1
    })
    this._sendRequest(opts, 'artist', cb)
  }

  artistGetSimilar (opts, cb) {
    if (!opts.artist && !opts.mbid) {
      return cb(new Error('Missing both artist and mbid'))
    }
    Object.assign(opts, {
      method: 'artist.getSimilar',
      autocorrect: 1
    })
    this._sendRequest(opts, 'similarartists', cb)
  }

  artistGetTopAlbums (opts, cb) {
    if (!opts.artist && !opts.mbid) {
      return cb(new Error('Missing both artist and mbid'))
    }
    Object.assign(opts, {
      method: 'artist.getTopAlbums',
      autocorrect: 1
    })
    this._sendRequest(opts, 'topalbums', cb)
  }

  artistGetTopTags (opts, cb) {
    if (!opts.artist && !opts.mbid) {
      return cb(new Error('Missing both artist and mbid'))
    }
    Object.assign(opts, {
      method: 'artist.getTopTags',
      autocorrect: 1
    })
    this._sendRequest(opts, 'toptags', cb)
  }

  artistGetTopTracks (opts, cb) {
    if (!opts.artist && !opts.mbid) {
      return cb(new Error('Missing both artist and mbid'))
    }
    Object.assign(opts, {
      method: 'artist.getTopTracks',
      autocorrect: 1
    })
    this._sendRequest(opts, 'toptracks', cb)
  }

  artistSearch (opts, cb) {
    if (!opts.artist) {
      return cb(new Error('Missing artist to search'))
    }
    Object.assign(opts, {
      method: 'artist.search',
      autocorrect: 1
    })
    this._sendRequest(opts, 'results', cb)
  }

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

  geoGetTopArtists (opts, cb) {
    if (!opts.country) {
      return cb(new Error('Missing country'))
    }
    Object.assign(opts, {
      method: 'geo.getTopArtists',
      autocorrect: 1
    })
    this._sendRequest(opts, 'topartists', cb)
  }

  geoGetTopTracks (opts, cb) {
    if (!opts.country) {
      return cb(new Error('Missing country'))
    }
    Object.assign(opts, {
      method: 'geo.getTopTracks',
      autocorrect: 1
    })
    this._sendRequest(opts, 'tracks', cb)
  }

  tagGetInfo (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('No tag given'))
    }
    opts.method = 'tag.getInfo'
    this._sendRequest(opts, 'tag', cb)
  }

  tagGetSimilar (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('No tag given'))
    }
    opts.method = 'tag.getSimilar'
    this._sendRequest(opts, 'similartags', cb)
  }

  tagGetTopAlbums (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('No tag given'))
    }
    opts.method = 'tag.getTopAlbums'
    this._sendRequest(opts, 'albums', cb)
  }

  tagGetTopArtists (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('No tag given'))
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
      return cb(new Error('No tag given'))
    }
    opts.method = 'tag.getTopTracks'
    this._sendRequest(opts, 'tracks', cb)
  }

  tagGetWeeklyChartList (opts, cb) {
    if (!opts.tag) {
      return cb(new Error('No tag given'))
    }
    opts.method = 'tag.getWeeklyChartList'
    this._sendRequest(opts, 'weeklychartlist', cb)
  };

  trackGetCorrection (opts, cb) {
    if (!opts.artist || !opts.track) {
      return cb(new Error('Missing required params'))
    }
    opts.method = 'track.getCorrection'
    this._sendRequest(opts, 'corrections', cb)
  }

  trackGetInfo (opts, cb) {
    if ((!opts.artist || !opts.track) && !opts.mbid) {
      return cb(new Error('Missing required params'))
    }
    Object.assign(opts, {
      method: 'track.getInfo',
      autocorrect: 1
    })
    this._sendRequest(opts, 'track', cb)
  }

  trackGetSimilar (opts, cb) {
    if ((!opts.artist || !opts.track) && !opts.mbid) {
      return cb(new Error('Missing required params'))
    }
    Object.assign(opts, {
      method: 'track.getSimilar',
      autocorrect: 1
    })
    this._sendRequest(opts, 'similartracks', cb)
  }

  trackGetTopTags (opts, cb) {
    if ((!opts.artist || !opts.track) && !opts.mbid) {
      return cb(new Error('Missing required params'))
    }
    Object.assign(opts, {
      method: 'track.getTopTags',
      autocorrect: 1
    })
    this._sendRequest(opts, 'toptags', cb)
  }

  trackSearch (opts, cb) {
    if (!opts.track) {
      return cb(new Error('Missing track for search'))
    }
    Object.assign(opts, {
      method: 'track.search',
      autocorrect: 1
    })
    this._sendRequest(opts, 'results', cb)
  }
}

module.exports = LastFM
