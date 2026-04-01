import { requestUrl } from 'obsidian';
import type MediaDbPlugin from '../../main';
import { BandModel } from '../../models/BandModel';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MediaType } from '../../utils/MediaType';
import { coerceYear, contactEmail, mediaDbVersion, pluginName } from '../../utils/Utils';
import { MUSICBRAINZ_NOTE_DATA_SOURCE } from '../musicBrainzConstants';
import { APIModel } from '../APIModel';

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

const EXCLUDED_SECONDARY_TYPES = new Set([
	'Compilation',
	'Live',
	'Remix',
	'Soundtrack',
	'Spokenword',
	'Interview',
	'Audio drama',
	'DJ-mix',
	'Mixtape/Street',
	'Demo',
	'Field recording',
]);

export class MusicBrainzBandAPI extends APIModel {
	plugin: MediaDbPlugin;
	apiDateFormat: string = 'YYYY-MM-DD';

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'MusicBrainz Band API';
		this.apiDescription = 'MusicBrainz artist search and studio album discography.';
		this.apiUrl = 'https://musicbrainz.org/';
		this.types = [MediaType.Band];
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
		const fetchData = await requestUrl({
			url: searchUrl,
			headers: this.mbHeaders(),
		});

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const data = (await fetchData.json) as ArtistSearchResponse;
		const ret: MediaTypeModel[] = [];

		for (const artist of data.artists ?? []) {
			const begin = artist['life-span']?.begin;
			ret.push(
				new BandModel({
					type: 'band',
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
					subType: 'band',
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const artistUrl = `https://musicbrainz.org/ws/2/artist/${encodeURIComponent(id)}?inc=tags+genres+url-rels&fmt=json`;
		const res = await requestUrl({
			url: artistUrl,
			headers: this.mbHeaders(),
		});

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

		return new BandModel({
			type: 'band',
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
			subType: 'band',
			userData: {
				personalRating: 0,
			},
		});
	}

	/**
	 * Lists release group MBIDs for studio albums (primary type album, excluding live/compilations/etc.).
	 * Passes release-group-status=website-default so MusicBrainz omits groups that only have bootleg, promotional, or pseudo-releases
	 * (see MusicBrainz API “Release (Group) Type and Status”).
	 */
	async listStudioAlbumReleaseGroupIds(artistId: string): Promise<string[]> {
		const collected: { id: string; date: string }[] = [];
		let offset = 0;
		const limit = 100;

		while (true) {
			await this.throttleMs(1100);
			const url = `https://musicbrainz.org/ws/2/release-group?artist=${encodeURIComponent(artistId)}&type=album&fmt=json&limit=${limit}&offset=${offset}&release-group-status=website-default`;

			const res = await requestUrl({
				url,
				headers: this.mbHeaders(),
			});

			if (res.status !== 200) {
				throw Error(`MDB | Received status code ${res.status} browsing release groups.`);
			}

			const data = (await res.json) as ReleaseGroupBrowseResponse;
			const groups = data['release-groups'] ?? [];
			if (groups.length === 0) {
				break;
			}

			for (const rg of groups) {
				if (rg['primary-type'] !== 'Album') {
					continue;
				}
				const secondary = rg['secondary-types'] ?? [];
				if (secondary.some(t => EXCLUDED_SECONDARY_TYPES.has(t))) {
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

		collected.sort((a, b) => a.date.localeCompare(b.date));
		return [...new Set(collected.map(c => c.id))];
	}

	/**
	 * For the 'artists' property, the link target is the Band note's file name
	 * (derived from the Band file name template), not just the raw artist string.
	 */
	override wikilinkValueFor(property: string, value: string, _obj: Record<string, unknown>, folderPrefix: string): string {
		if (property === 'artists') {
			const title = value.trim();
			const bandModel = new BandModel({
				type: 'band', title, englishTitle: title, year: 0,
				beginYear: '', releaseDate: '', dataSource: '', url: '', id: '',
				country: '', disambiguation: '', isni: '', genres: [], image: '',
				officialWebsite: '', subType: 'band',
			});
			const linkTarget = this.plugin.mediaTypeManager.getFileName(bandModel);
			return linkTarget === title ? `[[${linkTarget}]]` : `[[${linkTarget}|${title}]]`;
		}
		return super.wikilinkValueFor(property, value, _obj, folderPrefix);
	}

	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.MusicBrainzBandAPI_disabledMediaTypes;
	}
}
