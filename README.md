# Hayase Extensions
Alternative to [HayasexShiru Extensions](https://github.com/ReWelp/HayasexShiru-Extensions) after the backend went down, since I can't compare performance I can't guarantee it'll be better and the project lowkey all vibecoded (i just wanted to use hayase gng :sob:). I don't really know github like that, uh, so I made a seperate repository, enjoy.

## Installation
Paste this URL into Settings → Extensions → Repositories:
`https://raw.githubusercontent.com/450omenz/hayase-extensions/refs/heads/main/index.json`
or simply `gh:450omenz/hayase-extensions`

## v2.1.0
- Fixed a bug where result links resolved to a bare infohash instead of a magnet URI (`item.magnet || item.hash || item.link` was picking `hash` since the API never returns a `magnet` field) — torrents should now actually add/stream correctly.
- Added a `fetch` fallback to the global one in case the runtime doesn't inject `fetch` into the query object.
- The backend ([nyaasi-api](https://github.com/450omenz/nyaasi-api)) picked up season/year disambiguation, stricter batch/episode matching, retry+backoff on rate limits, and magnet trackers — no extension changes needed for those, they apply automatically.
