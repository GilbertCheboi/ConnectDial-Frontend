/**
 * shortMusicLibrary.js
 * --------------------
 * Static music track definitions.
 * In production these come from GET /api/media/music-library/
 * but we keep a local fallback so the editor renders even offline.
 */

const shortMusicLibrary = [
  {
    id: 'track_001',
    title: 'Stadium Anthem',
    artist: 'ConnectDial Originals',
    duration: 30,
    uri: null, // fetched from server at runtime
    genre: 'sport',
  },
  {
    id: 'track_002',
    title: 'Victory Lap',
    artist: 'ConnectDial Originals',
    duration: 28,
    uri: null,
    genre: 'sport',
  },
  {
    id: 'track_003',
    title: 'Fast Lane',
    artist: 'ConnectDial Originals',
    duration: 32,
    uri: null,
    genre: 'f1',
  },
  {
    id: 'track_004',
    title: 'Champions',
    artist: 'ConnectDial Originals',
    duration: 25,
    uri: null,
    genre: 'football',
  },
  {
    id: 'track_005',
    title: 'No Music',
    artist: '—',
    duration: 0,
    uri: null,
    genre: 'none',
  },
];

export default shortMusicLibrary;