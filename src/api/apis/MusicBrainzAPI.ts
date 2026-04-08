import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MusicReleaseModel } from '../../models/MusicReleaseModel';
import { RecordingModel } from '../../models/RecordingModel';
import { MediaType } from '../../utils/MediaType';
import { contactEmail, coerceYear, getLanguageName, mediaDbVersion, pluginName } from '../../utils/Utils';
import { verboseLog } from '../../utils/verboseLog';
import { APIModel } from '../APIModel';
import { MUSICBRAINZ_NOTE_DATA_SOURCE } from '../musicBrainzConstants';
import type { MusicBrainzReleaseGroupPrimaryTypeId, ReleaseGroupSecondaryTypeId } from '../musicBrainzReleaseGroupTypes';
import {
	releaseGroupMatchesPrimaryTypeImportFilter,
	releaseGroupPassesImportSecondaryFilter,
} from '../musicBrainzReleaseGroupTypes';
import { requestUrlRateLimited } from '../requestUrlRateLimited';

// sadly no open api schema available

interface Tag {
	name: string;
	count: number;
}
interface Genre {
	name: string;
	count: number;
	id: string;
	disambiguation: string;
}
interface ReleaseMedium {
	'track-count'?: number;
}

interface Release {
	id: string;
	'status-id': string;
	title: string;
	status: string;
	media?: ReleaseMedium[];
}

/**
 * Among non-bootleg releases, consider only those with exactly one medium (single-disc / single-sided editions),
 * then pick the one with the highest track count on that medium. If none have a single medium, returns the first
 * non-bootleg release.
 */
function pickNonBootlegReleaseWithMostTracks(releases: Release[] | undefined): Release | undefined {
	const nonBootleg = releases?.filter(r => r.status !== 'Bootleg') ?? [];
	if (nonBootleg.length === 0) {
		return undefined;
	}
	const singleMedium = nonBootleg.filter(r => r.media?.length === 1);
	if (singleMedium.length === 0) {
		return nonBootleg[0];
	}
	let best = singleMedium[0];
	let bestCount = best.media![0]['track-count'] ?? 0;
	for (let i = 1; i < singleMedium.length; i++) {
		const r = singleMedium[i];
		const count = r.media![0]['track-count'] ?? 0;
		if (count > bestCount) {
			best = r;
			bestCount = count;
		}
	}
	return best;
}

interface ArtistCredit {
	name: string;
	artist: {
		tags: Tag[];
		type: string;
		id: string;
		name: string;
		'short-name': string;
		country: string;
	};
}

interface SearchResponse {
	id: string;
	'type-id': string;
	score: number;
	'primary-type-id': string;
	'artists-credit-id': string;
	count: number;
	title: string;
	'first-release-date': string;
	'primary-type': string;
	'secondary-types'?: string[];
	'artist-credit': ArtistCredit[];
	releases: Release[];
	tags: Tag[];
}

interface RecordingSearchReleaseGroup {
	id: string;
	title: string;
	'primary-type'?: string;
	'secondary-types'?: string[];
	'first-release-date'?: string;
}

interface RecordingSearchTrack {
	number?: string;
	position?: number;
	title?: string;
	length?: number | null;
}

interface RecordingSearchRelease {
	id?: string;
	title?: string;
	date?: string;
	status?: string;
	'release-group'?: RecordingSearchReleaseGroup;
	media?: { track?: RecordingSearchTrack[] }[];
}

interface RecordingSearchHit {
	id: string;
	title: string;
	length?: number | null;
	'artist-credit': ArtistCredit[];
	'first-release-date'?: string;
	releases?: RecordingSearchRelease[];
}

interface RecordingDetailTrack {
	number?: string;
	position?: number;
	title?: string;
	length?: number | null;
}

interface RecordingDetailMedium extends ReleaseMedium {
	tracks?: RecordingDetailTrack[];
}

interface RecordingDetailRelease extends Release {
	'release-group'?: RecordingSearchReleaseGroup;
	media?: RecordingDetailMedium[];
	date?: string;
}

interface RecordingDetailResponse {
	id: string;
	title: string;
	length?: number | null;
	disambiguation?: string;
	'first-release-date'?: string;
	'artist-credit': ArtistCredit[];
	releases?: RecordingDetailRelease[];
	tags: Tag[];
	genres: Genre[];
}

interface IdResponse {
	id: string;
	tags: Tag[];
	'primary-type-id': string;
	'artist-credit': ArtistCredit[];
	title: string;
	genres: Genre[];
	'first-release-date': string;
	releases: Release[];
	'primary-type': string;
	rating: {
		value: number;
		'votes-count': number;
	};
}

interface MediaResponse {
	media: {
		'track-count': number;
		tracks: {
			'artist-credit': ArtistCredit[];
			length: number | null;
			number: string;
			position: number;
			title: string;
			recording: {
				id?: string;
				length: number;
				title: string;
			};
		}[];
	}[];
	'text-representation': {
		language: string;
		script: string;
	};
}

export class MusicBrainzAPI extends APIModel {
	plugin: MediaDbPlugin;
	apiDateFormat: string = 'YYYY-MM-DD';

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'MusicBrainz API';
		this.apiDescription = 'Free API for music releases.';
		this.apiUrl = 'https://musicbrainz.org/';
		this.types = [MediaType.MusicRelease, MediaType.Recording];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		verboseLog(`api "${this.apiName}" queried by Title`);

		const searchUrlReleaseGroup = `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(title)}&limit=50&fmt=json`;
		const searchUrlRecording = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(title)}&limit=50&fmt=json`;

		const [fetchReleaseGroups, fetchRecordings] = await Promise.all([
			requestUrlRateLimited(
				{
					url: searchUrlReleaseGroup,
					headers: {
						'User-Agent': `${pluginName}/${mediaDbVersion} (${contactEmail})`,
					},
				},
				{ logLabel: 'MusicBrainz' },
			),
			requestUrlRateLimited(
				{
					url: searchUrlRecording,
					headers: {
						'User-Agent': `${pluginName}/${mediaDbVersion} (${contactEmail})`,
					},
				},
				{ logLabel: 'MusicBrainz' },
			),
		]);

		if (fetchReleaseGroups.status !== 200) {
			throw Error(`[Media DB] Received status code ${fetchReleaseGroups.status} from ${this.apiName}.`);
		}
		if (fetchRecordings.status !== 200) {
			console.warn(`${this.apiName} recording search returned ${fetchRecordings.status} (release results still returned).`);
		}

		const primaryAllowed = this.plugin.settings.enabledReleaseGroupPrimaryTypes;
		const secondaryAllowed = this.plugin.settings.enabledReleaseGroupSecondaryTypes;

		const rgData = (await fetchReleaseGroups.json) as {
			'release-groups': SearchResponse[];
		};
		const ret: MediaTypeModel[] = [];

		for (const result of rgData['release-groups']) {
			if (!releaseGroupMatchesPrimaryTypeImportFilter(result['primary-type'], primaryAllowed)) {
				continue;
			}
			if (!releaseGroupPassesImportSecondaryFilter(result['secondary-types'], result.title, secondaryAllowed)) {
				continue;
			}
			ret.push(
				new MusicReleaseModel({
					type: 'musicRelease',
					title: result.title,
					englishTitle: result.title,
					year: coerceYear(
						result['first-release-date'] ? new Date(result['first-release-date']).getFullYear() : 0,
					),
					releaseDate: this.plugin.dateFormatter.format(result['first-release-date'], this.apiDateFormat) ?? 'unknown',
					dataSource: MUSICBRAINZ_NOTE_DATA_SOURCE,
					url: 'https://musicbrainz.org/release-group/' + result.id,
					id: result.id,
					image: 'https://coverartarchive.org/release-group/' + result.id + '/front-500.jpg',

					artists: result['artist-credit'].map(a => a.name),
					subType: result['primary-type'],
				}),
			);
		}

		if (fetchRecordings.status === 200) {
			const recData = (await fetchRecordings.json) as { recordings?: RecordingSearchHit[] };
			for (const rec of recData.recordings ?? []) {
				if (!recordingSearchHitPassesFilters(rec, primaryAllowed, secondaryAllowed)) {
					continue;
				}
				ret.push(recordingModelFromRecordingSearchHit(rec, this.plugin, this.apiDateFormat));
			}
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		verboseLog(`api "${this.apiName}" queried by ID`);

		// Fetch release group
		const groupUrl = `https://musicbrainz.org/ws/2/release-group/${encodeURIComponent(id)}?inc=releases+media+artists+tags+ratings+genres&fmt=json`;
		const groupResponse = await requestUrlRateLimited(
			{
				url: groupUrl,
				headers: {
					'User-Agent': `${pluginName}/${mediaDbVersion} (${contactEmail})`,
				},
			},
			{ logLabel: 'MusicBrainz' },
		);

		if (groupResponse.status === 404) {
			return await this.getRecordingById(id);
		}
		if (groupResponse.status !== 200) {
			throw Error(`[Media DB] Received status code ${groupResponse.status} from ${this.apiName}.`);
		}

		const result = (await groupResponse.json) as IdResponse;

		const chosenRelease = pickNonBootlegReleaseWithMostTracks(result.releases);
		if (!chosenRelease) {
			throw Error('[Media DB] No non-bootleg release found in release group.');
		}

		// Fetch recordings for the chosen release (single-medium non-bootleg with the most tracks when MB lists several)
		const releaseUrl = `https://musicbrainz.org/ws/2/release/${chosenRelease.id}?inc=recordings+artists&fmt=json`;
		verboseLog(`Fetching release recordings from: ${releaseUrl}`);

		const releaseResponse = await requestUrlRateLimited(
			{
				url: releaseUrl,
				headers: {
					'User-Agent': `${pluginName}/${mediaDbVersion} (${contactEmail})`,
				},
			},
			{ logLabel: 'MusicBrainz' },
		);

		if (releaseResponse.status !== 200) {
			throw Error(`[Media DB] Received status code ${releaseResponse.status} from ${this.apiName}.`);
		}

		const releaseData = (await releaseResponse.json) as MediaResponse;
		const tracks = extractTracksFromMedia(releaseData.media);

		// Calculate total length for the first release
		const totalrawLength =
			releaseData.media[0]?.tracks.reduce((sum, track) => {
				const len = track.length ?? track.recording?.length;
				return typeof len === 'number' && !isNaN(len) ? sum + len : sum;
			}, 0) ?? 0;
		const albumLengthCalc = millisecondsToMinutes(totalrawLength);

		return new MusicReleaseModel({
			type: 'musicRelease',
			title: result.title,
			englishTitle: result.title,
			year: coerceYear(
				result['first-release-date'] ? new Date(result['first-release-date']).getFullYear() : 0,
			),
			releaseDate: this.plugin.dateFormatter.format(result['first-release-date'], this.apiDateFormat) ?? 'unknown',
			dataSource: MUSICBRAINZ_NOTE_DATA_SOURCE,
			url: 'https://musicbrainz.org/release-group/' + result.id,
			id: result.id,
			image: 'https://coverartarchive.org/release-group/' + result.id + '/front-500.jpg',

			artists: result['artist-credit'].map(a => a.name),
			language: releaseData['text-representation'].language ? getLanguageName(releaseData['text-representation'].language) : 'Unknown',
			genres: result.genres.map(g => g.name),
			subType: result['primary-type'],
			albumDuration: albumLengthCalc,
			trackCount: releaseData.media[0]?.['track-count'] ?? 0,
			tracks: tracks,
			rating: result.rating.value * 2,

			userData: {
				personalRating: 0,
			},
		});
	}

	private async getRecordingById(recordingId: string): Promise<RecordingModel> {
		const recordingUrl = `https://musicbrainz.org/ws/2/recording/${encodeURIComponent(recordingId)}?inc=artists+releases+release-groups+tags+genres+media&fmt=json`;
		const recordingResponse = await requestUrlRateLimited(
			{
				url: recordingUrl,
				headers: {
					'User-Agent': `${pluginName}/${mediaDbVersion} (${contactEmail})`,
				},
			},
			{ logLabel: 'MusicBrainz' },
		);

		if (recordingResponse.status !== 200) {
			throw Error(`[Media DB] Received status code ${recordingResponse.status} from ${this.apiName} (recording lookup).`);
		}

		const data = (await recordingResponse.json) as RecordingDetailResponse;
		const candidates = data.releases ?? [];
		const release: RecordingDetailRelease | undefined =
			candidates.find(r => r.status !== 'Bootleg') ?? candidates[0];
		if (!release) {
			throw Error('[Media DB] Recording has no linked releases.');
		}

		const rg = release['release-group'];
		const albumReleaseGroupId = rg?.id ?? '';
		const dateStr = data['first-release-date'] ?? rg?.['first-release-date'] ?? release.date;
		const year = dateStr ? coerceYear(new Date(dateStr).getFullYear()) : 0;
		const releaseDate = dateStr
			? this.plugin.dateFormatter.format(dateStr, this.apiDateFormat) ?? 'unknown'
			: 'unknown';
		const trackNumber = trackNumberFromDetailReleaseMedia(release, data.title, data.length);

		return new RecordingModel({
			type: MediaType.Recording,
			title: data.title,
			englishTitle: data.title,
			year,
			releaseDate,
			dataSource: MUSICBRAINZ_NOTE_DATA_SOURCE,
			url: `https://musicbrainz.org/recording/${data.id}`,
			id: data.id,
			image: albumReleaseGroupId
				? `https://coverartarchive.org/release-group/${albumReleaseGroupId}/front-500.jpg`
				: '',
			subType: MediaType.Recording,
			genres: data.genres.map(g => g.name),
			artists: data['artist-credit'].map(a => a.name),
			albumTitle: rg?.title ?? release.title,
			albumReleaseGroupId,
			trackNumber,
			duration: data.length ? millisecondsToMinutes(data.length) : 'unknown',
			featuredArtists: [],
			geniusUrl: '',
			spotifyUrl: '',
			lyrics: '',
			userData: { personalRating: 0 },
		});
	}

	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.MusicBrainzAPI_disabledMediaTypes;
	}
}

function recordingSearchHitPassesFilters(
	rec: RecordingSearchHit,
	primaryAllowed: Record<MusicBrainzReleaseGroupPrimaryTypeId, boolean>,
	secondaryAllowed: Record<ReleaseGroupSecondaryTypeId, boolean>,
): boolean {
	const rg = rec.releases?.[0]?.['release-group'];
	if (!rg) {
		return true;
	}
	if (!releaseGroupMatchesPrimaryTypeImportFilter(rg['primary-type'], primaryAllowed)) {
		return false;
	}
	return releaseGroupPassesImportSecondaryFilter(rg['secondary-types'], rg.title, secondaryAllowed);
}

function trackNumberFromSearchRecordingRelease(
	release: RecordingSearchRelease | undefined,
	recTitle: string,
	recLength: number | null | undefined,
): number {
	if (!release?.media) {
		return 0;
	}
	for (const medium of release.media) {
		for (const t of medium.track ?? []) {
			if (t.title === recTitle && (recLength == null || recLength === undefined || t.length === recLength)) {
				if (typeof t.position === 'number') {
					return t.position;
				}
				const n = parseInt(String(t.number ?? ''), 10);
				return Number.isFinite(n) ? n : 0;
			}
		}
	}
	return 0;
}

function trackNumberFromDetailReleaseMedia(
	release: RecordingDetailRelease,
	recTitle: string,
	recLength: number | null | undefined,
): number {
	for (const medium of release.media ?? []) {
		for (const t of medium.tracks ?? []) {
			if (t.title === recTitle && (recLength == null || recLength === undefined || t.length === recLength)) {
				if (typeof t.position === 'number') {
					return t.position;
				}
				const n = parseInt(String(t.number ?? ''), 10);
				return Number.isFinite(n) ? n : 0;
			}
		}
	}
	return 0;
}

function recordingModelFromRecordingSearchHit(
	rec: RecordingSearchHit,
	plugin: MediaDbPlugin,
	apiDateFormat: string,
): RecordingModel {
	const firstRel = rec.releases?.find(r => r.status !== 'Bootleg') ?? rec.releases?.[0];
	const rg = firstRel?.['release-group'];
	const dateStr = rg?.['first-release-date'] ?? rec['first-release-date'] ?? firstRel?.date;
	const year = dateStr ? coerceYear(new Date(dateStr).getFullYear()) : 0;
	const releaseDate = dateStr ? plugin.dateFormatter.format(dateStr, apiDateFormat) ?? 'unknown' : 'unknown';
	const albumReleaseGroupId = rg?.id ?? '';
	const trackNumber = trackNumberFromSearchRecordingRelease(firstRel, rec.title, rec.length);

	return new RecordingModel({
		type: MediaType.Recording,
		title: rec.title,
		englishTitle: rec.title,
		year,
		releaseDate,
		dataSource: MUSICBRAINZ_NOTE_DATA_SOURCE,
		url: `https://musicbrainz.org/recording/${rec.id}`,
		id: rec.id,
		image: albumReleaseGroupId
			? `https://coverartarchive.org/release-group/${albumReleaseGroupId}/front-500.jpg`
			: '',
		subType: MediaType.Recording,
		genres: [],
		artists: rec['artist-credit'].map(a => a.name),
		albumTitle: rg?.title ?? firstRel?.title ?? '',
		albumReleaseGroupId,
		trackNumber,
		duration: rec.length ? millisecondsToMinutes(rec.length) : 'unknown',
		featuredArtists: [],
		geniusUrl: '',
		spotifyUrl: '',
		lyrics: '',
		userData: { personalRating: 0 },
	});
}

function extractTracksFromMedia(media: MediaResponse['media']): {
	number: number;
	title: string;
	duration: string;
	featuredArtists: string[];
}[] {
	if (!media || media.length === 0 || !media[0].tracks) return [];

		return media[0].tracks.map((track, index) => {
		const title = track.title ?? track.recording?.title ?? 'Unknown Title';
		const rawLength = track.length ?? track.recording?.length;
		const duration = rawLength ? millisecondsToMinutes(rawLength) : 'unknown';
		const featuredArtists = track['artist-credit']?.map(ac => ac.name) ?? [];
		const recordingId = track.recording?.id;

		return {
			number: index + 1,
			title,
			duration,
			featuredArtists,
			...(recordingId ? { recordingId } : {}),
		};
	});
}

function millisecondsToMinutes(milliseconds: number): string {
	const minutes = Math.floor(milliseconds / 60000);
	const seconds = Math.floor((milliseconds % 60000) / 1000);
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
