import type MediaDbPlugin from '../../main';
import { ArtistModel } from '../../models/ArtistModel';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MediaType } from '../../utils/MediaType';
import { coerceYear, contactEmail, mediaDbVersion, pluginName } from '../../utils/Utils';
import { APIModel } from '../APIModel';
import { requestUrlRateLimited } from '../requestUrlRateLimited';
import { MUSICBRAINZ_NOTE_DATA_SOURCE } from '../musicBrainzConstants';
import type { MusicBrainzReleaseGroupPrimaryTypeId, ReleaseGroupSecondaryTypeId } from '../musicBrainzReleaseGroupTypes';
import { MUSICBRAINZ_RELEASE_GROUP_PRIMARY_TYPES, releaseGroupPassesImportSecondaryFilter } from '../musicBrainzReleaseGroupTypes';

interface ArtistTag {
	name: string;
	count: number;
}

interface ArtistGenre {
	name: string;
}

interface ArtistSearchArtist {
	id: string;
	name: string;
	'life-span'?: { begin?: string; end?: string };
	country?: string;
	disambiguation?: string;
	isnis?: string[];
}

interface ArtistSearchResponse {
	artists: ArtistSearchArtist[];
}

interface ArtistDetailResponse {
	id: string;
	name: string;
	type?: string;
	'life-span'?: { begin?: string; end?: string };
	country?: string;
	disambiguation?: string;
	isnis?: string[];
	tags?: ArtistTag[];
	genres?: ArtistGenre[];
	relations?: { url?: { resource: string } | null; type: string }[];
}

interface ReleaseGroupListItem {
	id: string;
	title: string;
	'primary-type': string;
	'secondary-types'?: string[];
	'first-release-date'?: string;
}

interface ReleaseGroupBrowseResponse {
	'release-groups': ReleaseGroupListItem[];
}

function isniFromMusicBrainz(isnis: string[] | undefined): string {
	if (!isnis?.length) {
		return '';
	}
	return isnis.join(', ');
}

export class MusicBrainzArtistAPI extends APIModel {
	plugin: MediaDbPlugin;
	apiDateFormat: string = 'YYYY-MM-DD';

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'MusicBrainz Artist API';
		this.apiDescription = 'MusicBrainz artist search and studio release discography.';
		this.apiUrl = 'https://musicbrainz.org/';
		this.types = [MediaType.Artist];
	}

	private mbHeaders(): Record<string, string> {
		return {
			'User-Agent': `${pluginName}/${mediaDbVersion} (${contactEmail})`,
		};
	}

	private async throttleMs(ms: number): Promise<void> {
		await new Promise(resolve => setTimeout(resolve, ms));
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(title)}&limit=20&fmt=json`;
		const fetchData = await requestUrlRateLimited(
			{
				url: searchUrl,
				headers: this.mbHeaders(),
			},
			{ logLabel: 'MusicBrainz' },
		);

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const data = (await fetchData.json) as ArtistSearchResponse;
		const ret: MediaTypeModel[] = [];

		for (const artist of data.artists ?? []) {
			const begin = artist['life-span']?.begin;
			ret.push(
				new ArtistModel({
					type: 'artist',
					title: artist.name,
					englishTitle: artist.name,
					year: coerceYear(begin ? (begin.split('-')[0] ?? '') : ''),
					beginYear: begin ? (begin.split('-')[0] ?? '') : '',
					releaseDate: '',
					dataSource: MUSICBRAINZ_NOTE_DATA_SOURCE,
					url: 'https://musicbrainz.org/artist/' + artist.id,
					id: artist.id,
					country: artist.country ?? '',
					disambiguation: artist.disambiguation ?? '',
					isni: isniFromMusicBrainz(artist.isnis),
					genres: [],
					image: '',
					officialWebsite: '',
					subType: 'artist',
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const artistUrl = `https://musicbrainz.org/ws/2/artist/${encodeURIComponent(id)}?inc=tags+genres+url-rels&fmt=json`;
		const res = await requestUrlRateLimited(
			{
				url: artistUrl,
				headers: this.mbHeaders(),
			},
			{ logLabel: 'MusicBrainz' },
		);

		if (res.status !== 200) {
			throw Error(`MDB | Received status code ${res.status} from ${this.apiName}.`);
		}

		const artist = (await res.json) as ArtistDetailResponse;
		const begin = artist['life-span']?.begin;
		const beginYear = begin ? (begin.split('-')[0] ?? '') : '';

		let officialWebsite = '';
		for (const rel of artist.relations ?? []) {
			if (rel.type === 'official homepage' && rel.url?.resource) {
				officialWebsite = rel.url.resource;
				break;
			}
		}

		return new ArtistModel({
			type: 'artist',
			title: artist.name,
			englishTitle: artist.name,
			year: coerceYear(beginYear),
			beginYear,
			releaseDate: begin ? (this.plugin.dateFormatter.format(begin, this.apiDateFormat) ?? 'unknown') : '',
			dataSource: MUSICBRAINZ_NOTE_DATA_SOURCE,
			url: 'https://musicbrainz.org/artist/' + artist.id,
			id: artist.id,
			country: artist.country ?? '',
			disambiguation: artist.disambiguation ?? '',
			isni: isniFromMusicBrainz(artist.isnis),
			genres: [...new Set([...(artist.genres?.map(g => g.name) ?? []), ...(artist.tags?.map(t => t.name) ?? [])])],
			image: '',
			officialWebsite,
			subType: 'artist',
			userData: {
				personalRating: 0,
			},
		});
	}

	/**
	 * Lists release group MBIDs for an artist’s discography import, filtered by enabled MusicBrainz primary types
	 * and optional secondary types (live, compilation, …) per plugin settings.
	 * Passes release-group-status=website-default so MusicBrainz omits groups that only have bootleg, promotional, or pseudo-releases
	 * (see MusicBrainz API “Release (Group) Type and Status”).
	 */
	async listArtistDiscographyReleaseGroupIds(
		artistId: string,
		enabledPrimaryTypeIds: MusicBrainzReleaseGroupPrimaryTypeId[],
		secondaryTypesAllowed: Record<ReleaseGroupSecondaryTypeId, boolean>,
	): Promise<string[]> {
		if (enabledPrimaryTypeIds.length === 0) {
			return [];
		}

		const collected: { id: string; date: string }[] = [];

		for (const primaryTypeId of enabledPrimaryTypeIds) {
			const typeDef = MUSICBRAINZ_RELEASE_GROUP_PRIMARY_TYPES.find(t => t.id === primaryTypeId);
			if (!typeDef) {
				continue;
			}
			const browseParam = typeDef.browseParam;

			let offset = 0;
			const limit = 100;

			while (true) {
				await this.throttleMs(1100);
				const url = `https://musicbrainz.org/ws/2/release-group?artist=${encodeURIComponent(artistId)}&type=${encodeURIComponent(browseParam)}&fmt=json&limit=${limit}&offset=${offset}&release-group-status=website-default`;

				const res = await requestUrlRateLimited(
					{
						url,
						headers: this.mbHeaders(),
					},
					{ logLabel: 'MusicBrainz' },
				);

				if (res.status !== 200) {
					throw Error(`MDB | Received status code ${res.status} browsing release groups.`);
				}

				const data = (await res.json) as ReleaseGroupBrowseResponse;
				const groups = data['release-groups'] ?? [];
				if (groups.length === 0) {
					break;
				}

				for (const rg of groups) {
					if (rg['primary-type'] !== primaryTypeId) {
						continue;
					}
					if (
						!releaseGroupPassesImportSecondaryFilter(rg['secondary-types'], rg.title, secondaryTypesAllowed)
					) {
						continue;
					}
					collected.push({
						id: rg.id,
						date: rg['first-release-date'] ?? '',
					});
				}

				offset += limit;
				if (groups.length < limit) {
					break;
				}
			}
		}

		collected.sort((a, b) => a.date.localeCompare(b.date));
		return [...new Set(collected.map(c => c.id))];
	}

	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.MusicBrainzArtistAPI_disabledMediaTypes;
	}
}
