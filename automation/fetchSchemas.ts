import { $ } from 'utils/shellUtils';

async function fetchSchema() {
	// https://docs.api.jikan.moe/
	await $('bun openapi-typescript https://raw.githubusercontent.com/jikan-me/jikan-rest/master/storage/api-docs/api-docs.json -o ./src/api/schemas/MALAPI.ts');

	// https://www.giantbomb.com/forums/api-developers-3017/giant-bomb-openapi-specification-1901269/
	await $('bun openapi-typescript ./src/api/schemas/GiantBomb.json -o ./src/api/schemas/GiantBomb.ts');

	// https://www.omdbapi.com/swagger.json
	await $('bun openapi-typescript ./src/api/schemas/OMDb.json -o ./src/api/schemas/OMDb.ts');

	// https://github.com/internetarchive/openlibrary-api/blob/main/swagger.yaml
	await $('bun openapi-typescript ./src/api/schemas/OpenLibrary.json -o ./src/api/schemas/OpenLibrary.ts');
}

await fetchSchema();
