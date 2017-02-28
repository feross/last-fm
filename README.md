# last-fm [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][downloads-url]

[travis-image]: https://img.shields.io/travis/feross/last-fm/master.svg
[travis-url]: https://travis-ci.org/feross/last-fm
[npm-image]: https://img.shields.io/npm/v/last-fm.svg
[npm-url]: https://npmjs.org/package/last-fm
[downloads-image]: https://img.shields.io/npm/dm/last-fm.svg
[downloads-url]: https://npmjs.org/package/last-fm

### Simple, robust LastFM API client (for public data)

## Install

```
npm install last-fm
```

## Why this package?

The most useful data on LastFM is the public music data. When building an app that
incorporates music data from LastFM, lots of functionality provided by the LastFM
API isn't necessary – authorizing as a user, liking tracks, adding/removing tags,
getting a list of songs in the user's "library", etc.

This package only provides the LastFM API methods that use GET requests to fetch
data, making it **smaller and simpler** than the other LastFM libraries.

If this matches your use case, consider using this package.

## Features

  - Powered by the [LastFM API](http://www.last.fm/api)
  - Lightweight library, only provides the GET methods from the Last.fm API

## Usage

First, [get an API key](https://www.last.fm/api/account/create) from Last.fm.

```js
const LastFM = require('last-fm')
const lastfm = new LastFM('API_KEY', 'MyApp/1.0.0 (http://example.com)')

lastfm.trackSearch({ track: 'the greatest' }, (err, data) => {
  if (err) console.error(err)
  else console.log(data)
})
```

## API

### `lastfm = new LastFM(key, [userAgent])`

Create a new LastFM API client with the given public API `key`.

Since all the LastFM calls supported by this module access public data, the secret
key is not required.

`userAgent` can be a string to use as the `User-Agent` header in http requests.

## Convenience API

These APIs are not part of the LastFM documentation, but they use data from the API
and process it into a more useful form.

### `lastfm.search(opts, (err, data) => {})`

Search for artists, tracks, or albums by name.

This returns the "top result" across all result types, prioritizing an exact query
match, if one exists. Otherwise, the most popular result by number of "listeners"
is used.

- `opts.q` - the search query
- `opts.limit` - the number of each type of result to fetch

## Album API

### `lastfm.albumGetInfo(opts, (err, data) => {})`

Get the metadata and tracklist for an album on Last.fm using the album name.

- [album.getInfo](http://www.last.fm/api/show/album.getInfo)

### `lastfm.albumGetTopTags(opts, (err, data) => {})`

Get the top tags for an album on Last.fm, ordered by popularity.

- [album.getTopTags](http://www.last.fm/api/show/album.getTopTags)

### `lastfm.albumSearch(opts, (err, data) => {})`

Search for an album by name. Returns album matches sorted by relevance.

- [album.search](http://www.last.fm/api/show/album.search)

## Artist API

### `lastfm.artistGetCorrection(opts, (err, data) => {})`

Use the last.fm corrections data to check whether the supplied artist has a correction to a canonical artist

- [artist.getCorrection](http://www.last.fm/api/show/artist.getCorrection)

### `lastfm.artistGetInfo(opts, (err, data) => {})`

Get the metadata for an artist. Includes biography, truncated at 300 characters.

- [artist.getInfo](http://www.last.fm/api/show/artist.getInfo)

### `lastfm.artistGetSimilar(opts, (err, data) => {})`

Get all the artists similar to this artist

- [artist.getSimilar](http://www.last.fm/api/show/artist.getSimilar)

### `lastfm.artistGetTopAlbums(opts, (err, data) => {})`

Get the top albums for an artist on Last.fm, ordered by popularity.

- [artist.getTopAlbums](http://www.last.fm/api/show/artist.getTopAlbums)

### `lastfm.artistGetTopTags(opts, (err, data) => {})`

Get the top tags for an artist on Last.fm, ordered by popularity.

- [artist.getTopTags](http://www.last.fm/api/show/artist.getTopTags)

### `lastfm.artistGetTopTracks(opts, (err, data) => {})`

Get the top tracks by an artist on Last.fm, ordered by popularity

- [artist.getTopTracks](http://www.last.fm/api/show/artist.getTopTracks)

### `lastfm.artistSearch(opts, (err, data) => {})`

Search for an artist by name. Returns artist matches sorted by relevance.

- [artist.search](http://www.last.fm/api/show/artist.search)

## Chart API

### `lastfm.chartGetTopArtists(opts, (err, data) => {})`

Get the top artists chart

- [chart.getTopArtists](http://www.last.fm/api/show/chart.getTopArtists)

### `lastfm.chartGetTopTags(opts, (err, data) => {})`

Get the top tags chart

- [chart.getTopTags](http://www.last.fm/api/show/chart.getTopTags)

### `lastfm.chartGetTopTracks(opts, (err, data) => {})`

Get the top tracks chart

## Geo API

- [chart.getTopTracks](http://www.last.fm/api/show/chart.getTopTracks)

### `lastfm.geoGetTopArtists(opts, (err, data) => {})`

Get the most popular artists on Last.fm by country

- [geo.getTopArtists](http://www.last.fm/api/show/geo.getTopArtists)

### `lastfm.geoGetTopTracks(opts, (err, data) => {})`

Get the most popular tracks on Last.fm last week by country

- [geo.getTopTracks](http://www.last.fm/api/show/geo.getTopTracks)

## Tag API

### `lastfm.tagGetInfo(opts, (err, data) => {})`

Get the metadata for a tag

- [tag.getInfo](http://www.last.fm/api/show/tag.getInfo)

### `lastfm.tagGetSimilar(opts, (err, data) => {})`

Search for tags similar to this one. Returns tags ranked by similarity, based on listening data.

- [tag.getSimilar](http://www.last.fm/api/show/tag.getSimilar)

### `lastfm.tagGetTopAlbums(opts, (err, data) => {})`

Get the top albums tagged by this tag, ordered by tag count.

- [tag.getTopAlbums](http://www.last.fm/api/show/tag.getTopAlbums)

### `lastfm.tagGetTopArtists(opts, (err, data) => {})`

Get the top artists tagged by this tag, ordered by tag count.

- [tag.getTopArtists](http://www.last.fm/api/show/tag.getTopArtists)

### `lastfm.tagGetTopTags(opts, (err, data) => {})`

Fetches the top global tags on Last.fm, sorted by popularity (number of times used)

- [tag.getTopTags](http://www.last.fm/api/show/tag.getTopTags)

### `lastfm.tagGetTopTracks(opts, (err, data) => {})`

Get the top tracks tagged by this tag, ordered by tag count.

## Track API

- [tag.getTopTracks](http://www.last.fm/api/show/tag.getTopTracks)

### `lastfm.tagGetWeeklyChartList(opts, (err, data) => {})`

Get a list of available charts for this tag, expressed as date ranges which can be sent to the chart services.

- [tag.getWeeklyChartList](http://www.last.fm/api/show/tag.getWeeklyChartList)

### `lastfm.trackGetCorrection(opts, (err, data) => {})`

Use the last.fm corrections data to check whether the supplied track has a correction to a canonical track

- [track.getCorrection](http://www.last.fm/api/show/track.getCorrection)

### `lastfm.trackGetInfo(opts, (err, data) => {})`

Get the metadata for a track on Last.fm using the artist/track name.

- [track.getInfo](http://www.last.fm/api/show/track.getInfo)

### `lastfm.trackGetSimilar(opts, (err, data) => {})`

Get the similar tracks for this track on Last.fm, based on listening data.

- [track.getSimilar](http://www.last.fm/api/show/track.getSimilar)

### `lastfm.trackGetTopTags(opts, (err, data) => {})`

Get the top tags for this track on Last.fm, ordered by tag count. Supply a track & artist name.

- [track.getTopTags](http://www.last.fm/api/show/track.getTopTags)

### `lastfm.trackSearch(opts, (err, data) => {})`

Search for a track by track name. Returns track matches sorted by relevance.

- [track.search](http://www.last.fm/api/show/track.search)

## License

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org).
