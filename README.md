## Obsidian Media DB Plugin

A plugin that can query multiple APIs for movies, series, anime, manga, games, music and wiki articles, and import them into your vault.

### Features

#### Search by Title

Search a movie, series, anime, game, music release or wiki article by its name across multiple APIs.

#### Search by ID

Allows you to search by an ID that varies from API to API. Concrete information on this feature can be found in the description of the individual APIs.

#### Templates

The plugin allows you to set a template note that gets added to the end of any note created by this plugin.  
The plugin also offers simple "template tgs". E.g. if the template includes `{{ title }}`, it will be replaced by the title of the movie, show or game.  
Note that "template tags" are surrounded with two curly braces and that the spaces inside the curly braces are important.

For arrays there are two special ways of displaying them.

- using `{{ LIST:variable_name }}` will result in
    ```
      - element 1
      - element 2
      - element 3
      - ...
    ```
- using `{{ ENUM:variable_name }}` will result in
    ```
      element 1, element 2, element 3, ...
    ```

Available variables that can be used in template tags are the same variables from the metadata of the note.

I also published my own templates [here](https://github.com/mProjectsCode/obsidian-media-db-templates).

#### Metadata field customization

Allows you to rename the metadata fields this plugin generates through mappings.

A mapping has to follow this syntax `[origional property name] -> [new property name]`.
Multiple mappings are separated by a new line.
So e.g.:

```
title -> name
year -> releaseYear
```

#### Bulk Import

The plugin allows you to import your preexisting media collection and upgrade them to Media DB entries.

##### Prerequisites

The preexisting media notes must be inside a folder in your vault.
For the plugin to be able to query them they need one metadata field that is used as the title the piece of media is searched by.
This can be achieved by for example using a `csv` import plugin to import an existing list from outside of obsidian.

##### Importing

To start the import process, right-click on the folder and select the `Import folder as Media DB entries` option.
Then specify the API to search, if the current note content and metadata should be appended to the Media DB entry and the name of the metadata field that contains the title of the piece of media.

Then the plugin will go through every file in the folder and prompt you to select from the search results.

##### Post import

After all files have been imported or the import was canceled, you will find the new entries as well as an error report that contains any errors or skipped/canceled files in the folder specified in the setting of the plugin.

### How to install

**The plugin is now released, so it can be installed directly through obsidian's plugin installer.**

Alternatively, you can manually download the zip archive from the latest release here on GitHub.  
After downloading, extract the archive into the `.obsidian/plugins` folder in your vault.

The folder structure should look like this:

```
[path to your vault]
|_ .obsidian
   |_ plugins
      |_ obsidian-media-db-plugin
         |_ main.js
         |_ manifest.json
         |_ styles.css
```

### How to use

(pictures are coming)

Once you have installed this plugin, you will find a database icon in the left ribbon.  
When using this or the `Add new Media DB entry` command, a popup will open.  
Here you can enter the title of what you want to search for and then select in which APIs to search.

After clicking search, a new popup will open prompting you to select from the search results.  
Now you select the result you want and the plugin will cast it's magic and create a new note in your vault, that contains the metadata of the selected search result.

### Currently supported media types

- movies (including specials)
- series (including OVAs)
- games
- music releases
- wiki articles
- books

### Currently supported APIs:

| Name                                                 | Description                                                                                       | Supported formats                                     | Authentification                                                                                                                                                                   | Rate limiting                                                                                                                                                                                                                      | SFW filter support |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| [Jikan](https://jikan.moe/)                          | Jikan is an API that uses [My Anime List](https://myanimelist.net) and offers metadata for anime. | series, movies, specials, OVAs, manga, manwha, novels | No                                                                                                                                                                                 | 60 per minute and 3 per second                                                                                                                                                                                                     | Yes                |
| [OMDb](https://www.omdbapi.com/)                     | OMDb is an API that offers metadata for movie, series and games.                                  | series, movies, games                                 | Yes, you can get a free key here [here](https://www.omdbapi.com/apikey.aspx)                                                                                                       | 1000 per day                                                                                                                                                                                                                       | No                 |
| [MusicBrainz](https://musicbrainz.org/)              | MusicBrainz is an API that offers information about music releases.                               | music releases                                        | No                                                                                                                                                                                 | 50 per second                                                                                                                                                                                                                      | No                 |
| [Wikipedia](https://en.wikipedia.org/wiki/Main_Page) | The Wikipedia API allows access to all Wikipedia articles.                                        | wiki articles                                         | No                                                                                                                                                                                 | None                                                                                                                                                                                                                               | No                 |
| [Steam](https://store.steampowered.com/)             | The Steam API offers information on all steam games.                                              | games                                                 | No                                                                                                                                                                                 | 10000 per day                                                                                                                                                                                                                      | No                 |
| [Open Library](https://openlibrary.org)              | The OpenLibrary API offers metadata for books                                                     | books                                                 | No                                                                                                                                                                                 | Cover access is rate-limited when not using CoverID or OLID by max 100 requests/IP every 5 minutes. This plugin uses OLID so there shouldn't be a rate limit.                                                                      | No                 |
| [Moby Games](https://www.mobygames.com)              | The Moby Games API offers metadata for games for all platforms                                    | games                                                 | Yes, by making an account [here](https://www.mobygames.com/user/register/). NOTE: As of September 2024 the API key is no longer free so consider using Giant Bomb or steam instead | API requests are limited to 360 per hour (one every ten seconds). In addition, requests should be made no more frequently than one per second.                                                                                     | No                 |
| [Giant Bomb](https://www.giantbomb.com)              | The Giant Bomb API offers metadata for games for all platforms                                    | games                                                 | Yes, by making an account [here](https://www.giantbomb.com/login-signup/)                                                                                                          | API requests are limited to 200 requests per resource, per hour. In addition, they implement velocity detection to prevent malicious use. If too many requests are made per second, you may receive temporary blocks to resources. | No                 |
| [VNDB](https://vndb.org/)                            | The VNDB API offers metadata for visual novels                                                    | games                                                 | No                                                                                                                                                                                 | 200 requests per 5 minutes                                                                                                                                                                                                         | Yes                |

#### Notes

- [Jikan](https://jikan.moe/)
    - sometimes the api is very slow, this is normal
    - you need to use the title the anime has on [My Anime List](https://myanimelist.net), which is in most cases the japanese title
        - e.g. instead of "Demon Slayer" you have to search "Kimetsu no Yaiba"

#### Search by ID

- [Jikan](https://jikan.moe/)
    - the ID you need is the ID of the anime on [My Anime List](https://myanimelist.net)
    - you can find this ID in the URL
        - e.g. for "Beyond the Boundary" the URL looks like this `https://myanimelist.net/anime/18153/Kyoukai_no_Kanata` so the ID is `18153`
- [Jikan Manga](https://jikan.moe/)
    - the ID you need is the ID of the manga on [My Anime List](https://myanimelist.net)
    - you can find this ID in the URL
        - e.g. for "All You Need Is Kill" the URL looks like this `https://myanimelist.net/manga/62887/All_You_Need_Is_Kill` so the ID is `62887`
- [OMDb](https://www.omdbapi.com/)
    - the ID you need is the ID of the movie or show on [IMDb](https://www.imdb.com)
    - you can find this ID in the URL
        - e.g. for "Rogue One" the URL looks like this `https://www.imdb.com/title/tt3748528/` so the ID is `tt3748528`
- [MusicBrainz](https://musicbrainz.org/)
    - the id of a release is not easily accessible, you are better off just searching by title
- [Wikipedia](https://en.wikipedia.org/wiki/Main_Page)
    - [here](https://en.wikipedia.org/wiki/Wikipedia:Finding_a_Wikidata_ID) is a guide to finding the Wikipedia ID for an article
- [Steam](https://store.steampowered.com/)
    - you can find this ID in the URL
        - e.g. for "Factorio" the URL looks like this `https://store.steampowered.com/app/427520/Factorio/` so the ID is `427520`
- [Open Library](https://openlibrary.org)
    - The ID you need is the "work" ID and not the "book" ID, it needs to start with `/works/`. You can find this ID in the URL
        - e.g. for "Fantastic Mr. Fox" the URL looks like this `https://openlibrary.org/works/OL45804W` so the ID is `/works/OL45804W`
        - This URL is located near the top of the page above the title, see `An edition of Fantastic Mr Fox (1970) `
- [Moby Games](https://www.mobygames.com)
    - you can find this ID in the URL
        - e.g. for "Bioshock 2" the URL looks like this `https://www.mobygames.com/game/45089/bioshock-2/` so the ID is `45089`
- [Giant Bomb](https://www.giantbomb.com)
    - you can find this ID in the URL
        - e.g. for "Dota 2" the URL looks like this `https://www.giantbomb.com/dota-2/3030-32887/` so the ID is `3030-32887`
- [VNDB](https://vndb.org/)
    - Located in the novel's VNDB URL path
        - e.g. The ID for [Katawa Shoujo](https://vndb.org/v945) (`https://vndb.org/v945`) is `v945`

### Problems, unexpected behavior or improvement suggestions?

You are more than welcome to open an issue on [GitHub](https://github.com/mProjectsCode/obsidian-media-db-plugin/issues).

### Contributions

Thank you for wanting to contribute to this project.

Contributions are always welcome. If you have an idea, feel free to open a feature request under the issue tab or even create a pull request.

### Credits

Credits go to:

- https://github.com/anpigon/obsidian-book-search-plugin for some inspiration and the idea to make this plugin
- https://github.com/liamcain/obsidian-periodic-notes for 99% of `Suggest.ts` and `FolderSuggest.ts`
