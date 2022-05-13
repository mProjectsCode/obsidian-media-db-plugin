## Obsidian Media DB Plugin

A plugin that can query multiple APIs for movies, series, anime and games, and import them into your vault.

### Features
#### Search by Title
Search a movie, series, anime or game by its name across multiple APIs.

#### Search by ID
Allows you to search by an ID that varies from API to API. Concrete info can be found in the description of the individual APIs.

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
    

I also published my own templates [here](https://github.com/mProjectsCode/obsidian-media-db-templates).

### Currently supported media types
- movies (including specials)
- series (including OVAs)
- games

### Currently supported APIs:
- [Jikan](https://jikan.moe/), an API that uses [My Anime List](https://myanimelist.net)
  - supported formats
    - series
    - movies
    - specials
    - OVAs
  - authentication
    - no authentication or API key needed
  - SFW filter support
    - yes
  - Search by ID
    - the ID you need is the ID of the anime on [My Anime List](https://myanimelist.net)
    - you can find this ID in the URL
      - e.g. for "Beyond the Boundary" the URL looks like this `https://myanimelist.net/anime/18153/Kyoukai_no_Kanata` so the ID is `18153`
  - notes
    - sometimes the api is very slow, this is normal
    - you need to use the title the anime has on [My Anime List](https://myanimelist.net), which is in most cases the japanese title
      - e.g. instead of "Demon Slayer" you have to search "Kimetsu no Yaiba"
    - the API is rate limited to
      - 60 requests per minute
      - 3 requests per second
- [OMDb](https://www.omdbapi.com/)
  - supported formats
    - series
    - movies
    - games
  - authentication
    - an API key is needed
    - you can get one [here](https://www.omdbapi.com/apikey.aspx) for free
  - SFW filter support
    - no, but I haven't encountered any NSFW content while developing this plugin
  - Search by ID
    - the ID you need is the ID of the movie or show on [IMDb](https://www.imdb.com)
    - you can find this ID in the URL
      - e.g. for "Rogue One" the URL looks like this `https://www.imdb.com/title/tt3748528/` so the ID is `tt3748528`
  - notes
    - the api is rate limited to 1000 requests a day
    
### Contributions
Thank you for wanting to contribute to this project. 

Contributions are always welcome. If you have an idea, feel free to open a feature request under the issue tab or even create a pull request.

