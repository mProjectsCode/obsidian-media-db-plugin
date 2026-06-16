#! /bin/env bash

# IMPORTANT: needs to be ran from this directory, otherwise the output files will be generated in the wrong place

# https://docs.api.jikan.moe/
bun openapi-typescript https://raw.githubusercontent.com/jikan-me/jikan-rest/master/storage/api-docs/api-docs.json -o ./MALAPI.ts

# https://www.giantbomb.com/forums/api-developers-3017/giant-bomb-openapi-specification-1901269/
bun openapi-typescript ./GiantBomb.json -o ./GiantBomb.ts

# https://github.com/internetarchive/openlibrary-api/blob/main/swagger.yaml
bun openapi-typescript ./OpenLibrary.json -o ./OpenLibrary.ts

# https://developer.themoviedb.org/openapi
bun openapi-typescript https://developer.themoviedb.org/openapi/tmdb-api.json -o ./TMDB.ts