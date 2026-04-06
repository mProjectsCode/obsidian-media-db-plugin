# Changelog

# Unreleased

- Added support for the `VNDB` API [#165](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/165) (thanks Senyksia)
- Added support for comic books through the `Comic Vine` API [#176](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/176) (thanks ltctceplrm)
- Fixed a typo issue in Steam search [#180](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/180) (thanks ltctceplrm)
- Added API toggle improvements and image download options [#183](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/183) (thanks ltctceplrm)
- Added a confirmation step before overwriting existing notes [#184](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/184) (thanks ltctceplrm)
- Improved Open Library integration and added plot/description support [#190](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/190) [#192](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/192) [#237](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/237) [#238](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/238) (thanks ltctceplrm)
- Added country, box office and age rating fields for movies and series [#196](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/196) (thanks ltctceplrm)
- Added release date support for MusicBrainz releases [#198](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/198) (thanks ZackBoe)
- Limited MusicBrainz cover art images to 500px [#199](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/199) (thanks ZackBoe)
- Added tracks, language, track count, and total duration support for music releases [#202](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/202) [#233](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/233) (thanks ltctceplrm)
- Cleaned up generated file names to remove illegal characters [#206](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/206) (thanks Spydarlee)
- Added batch/folder import by ID [#207](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/207) (thanks Spydarlee)
- Fixed double URI encoding when querying the Giant Bomb API by title [#209](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/209) (thanks Spydarlee)
- Improved property mappings with table view, wiki links option, and bug fixes [#195](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/195) [#231](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/231) (thanks ltctceplrm)
- Added TMDB season selection modal and improved season metadata handling [#220](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/220) (thanks ltctceplrm)
- Added board game API authorization and improved related error handling [#223](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/223) [#227](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/227) (thanks ltctceplrm)
- Swapped TMDB API key usage to TMDB API token [#246](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/246) (thanks ZackBoe)
- Updated comic/manga tags to vary based on subtype [#247](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/247) (thanks ltctceplrm)
- Re-implemented `IGDB` and `RAWG` providers with improved type safety and conflict resolution [#239](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/239) (thanks m24ih)
- Added support for Japanese titles in MyAnimeList [#253](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/253) (thanks ltctceplrm)
- Migrated plugin secrets to Obsidian secret storage
- Migrated settings UI from Svelte to Solid
- Various internal refactors, dependency updates, and bug fixes

# 0.8.0

- Fixed bugs when API keys for certain APIs were missing [#161](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/161) (thanks ltctceplrm)
- Added support for other languages when remapping fields [#162](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/162) (thanks ltctceplrm)
- Added support for the `Giant Bomb` API [#166](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/166) (thanks ltctceplrm)
- Migration to Svelte 5
- Some internal changes and improved error handling

# 0.7.2

- Improvements to UI text to match the Obsidian plugin guidelines [#153](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/153) (thanks kepano)

# 0.7.1

- Fixed mobygames result without an image crashing the search [#148](https://github.com/mProjectsCode/obsidian-media-db-plugin/issues/148) [#149](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/149) (thanks ltctceplrm)
- Use Steam Community SearchApps for Steam search by title for fuzzy results [#146](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/146) (thanks ZackBoe)
- Don't search APIs that don't have an API key set [#147](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/147) (thanks ZackBoe)
- Use https for all API requests [#147](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/147) (thanks ZackBoe)
- Sped up multi API search
- Fixed unrelated APIs being searched when searching by a specific media type

# 0.7.0

- renamed the plugin to just `Media DB`
- Add plot field when fetching data from OMDb [#106](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/106) (thanks onesvat)
- Added support for Moby Games API [#131](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/131) (thanks ltctceplrm)
- Add index operator for arrays when templating [#129](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/129) (thanks kelszo)
- Support disabling default front matter and add support for Templater [#119](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/119) (thanks kelszo)
- Add option to open new note in a new tab [#128](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/128) (thanks kelszo)
- Added developers and publishers field to games [#122](https://github.com/mProjectsCode/obsidian-media-db-plugin/pull/122) (thanks ltctceplrm)

# 0.6.0

- Added manga support through Jikan
- Added book support through Open Library
- Added album cover support for music releases
- Split up `producer` into `studio`, `director` and `writer` for movies and series
- fixed the preview modal not displaying the frontmatter anymore

# 0.5.0

- New simple search modal, select the media type and search all applicable APIs
- More data for Board Games
- Actors and Streaming Platforms for Movies and Series
- Separate new file location for all media types
- Separate command for each media type
- Fix problems with closing of preview modal

# 0.3.2

- Added Board Game Geek API (documentation pending)
- More information in the search results
- various fixes

# 0.3.1

- various fixes

# 0.3.0

- Added bulk import. Import a folder of media notes as Media DB entries (thanks to [PaperOrb](https://github.com/PaperOrb) on GitHub for their input and for helping me test this feature)
- Added a custom result select modal that allows you to select multiple results at once
- Fixed a bug where the note creation would fail when the metadata included a field with the values `null` or `undefined`

# 0.2.1

- fixed a small bug with the initial selection of an API in the ID search modal

# 0.2.0

- Added the option to rename metadata fields through property mappings
- fixed note creation falling, when the folder set in the settings did not exist
