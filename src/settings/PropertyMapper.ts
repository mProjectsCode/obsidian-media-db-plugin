import type MediaDbPlugin from '../main';
import { BandModel } from '../models/BandModel';
import { MusicReleaseModel } from '../models/MusicReleaseModel';
import { MediaType } from '../utils/MediaType';
import { noteTypeValueForMedia, resolveMetadataTypeToMediaType } from '../utils/noteTypeSettings';
import { coerceYear } from '../utils/Utils';
import { PropertyMappingOption } from './PropertyMapping';

export class PropertyMapper {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Converts an object using the conversion rules for its type.
	 * Returns an unaltered object if object.type is null or undefined or if there are no conversion rules for the type.
	 *
	 * @param obj
	 */
	convertObject(obj: Record<string, unknown>): Record<string, unknown> {
		if (!Object.hasOwn(obj, 'type')) {
			return obj;
		}

		// console.log(obj.type);

		const internalMediaType = resolveMetadataTypeToMediaType(this.plugin.settings, obj.type);
		if (!internalMediaType) {
			return obj;
		}

		const propertyMappingModel = this.plugin.settings.propertyMappingModels.find(x => x.type === internalMediaType);
		if (!propertyMappingModel) {
			return obj;
		}

		const propertyMappings = propertyMappingModel.properties;

		const newObj: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(obj)) {
			for (const propertyMapping of propertyMappings) {
				if (propertyMapping.property === key) {
					let finalValue = value;
					if (propertyMapping.wikilink) {
						const useBandFileNameForArtists =
							propertyMapping.property === 'artists' &&
							(internalMediaType === MediaType.Song || internalMediaType === MediaType.MusicRelease);
						const useMusicReleaseFileNameForAlbumTitle =
							propertyMapping.property === 'albumTitle' && internalMediaType === MediaType.Song;

						if (typeof value === 'string') {
							if (useBandFileNameForArtists) {
								finalValue = this.bandArtistWikilink(value);
							} else if (useMusicReleaseFileNameForAlbumTitle) {
								finalValue = this.songAlbumTitleWikilink(value, obj);
							} else {
								finalValue = `[[${value}]]`;
							}
						} else if (Array.isArray(value)) {
							finalValue = value.map((v: unknown) => {
								if (typeof v !== 'string') {
									return v;
								}
								if (useBandFileNameForArtists) {
									return this.bandArtistWikilink(v);
								}
								if (useMusicReleaseFileNameForAlbumTitle) {
									return this.songAlbumTitleWikilink(v, obj);
								}
								return `[[${v}]]`;
							});
						}
					}
					if (propertyMapping.mapping === PropertyMappingOption.Map) {
						// @ts-ignore
						newObj[propertyMapping.newProperty] = finalValue;
					} else if (propertyMapping.mapping === PropertyMappingOption.Remove) {
						// do nothing
					} else if (propertyMapping.mapping === PropertyMappingOption.Default) {
						// @ts-ignore
						newObj[key] = finalValue;
					}
					break;
				}
			}
		}

		return newObj;
	}

	/**
	 * Converts an object back using the conversion rules for its type.
	 * Returns an unaltered object if object.type is null or undefined or if there are no conversion rules for the type.
	 *
	 * @param obj
	 */
	convertObjectBack(obj: Record<string, unknown>): Record<string, unknown> {
		const models = this.plugin.settings.propertyMappingModels;

		let matchedModel: (typeof models)[number] | undefined;
		for (const model of models) {
			const typePm = model.properties.find(p => p.property === 'type');
			const typeKey =
				typePm?.mapping === PropertyMappingOption.Map && typePm.newProperty
					? typePm.newProperty
					: 'type';
			if (!Object.hasOwn(obj, typeKey)) {
				continue;
			}
			let typeVal: unknown = obj[typeKey];
			if (typeVal === 'manga') {
				typeVal = 'comicManga';
				console.debug(`MDB | updated metadata type`, typeVal);
			}
			const typeStr = String(typeVal).trim();
			if (
				typeStr === (model.type as string) ||
				typeStr === noteTypeValueForMedia(this.plugin.settings, model.type)
			) {
				matchedModel = model;
				break;
			}
		}

		if (!matchedModel) {
			return obj;
		}

		const propertyMappings = matchedModel.properties;
		const originalObj: Record<string, unknown> = {};

		objLoop: for (const [key, value] of Object.entries(obj)) {
			for (const propertyMapping of propertyMappings) {
				if (propertyMapping.property === key) {
					originalObj[key] = value;
					continue objLoop;
				}
			}
			for (const propertyMapping of propertyMappings) {
				if (
					propertyMapping.mapping === PropertyMappingOption.Map &&
					propertyMapping.newProperty === key
				) {
					originalObj[propertyMapping.property] = value;
					continue objLoop;
				}
			}
		}

		return originalObj;
	}

	/**
	 * Wikilink for an artist name using the Band file name template as the link target and the raw artist title as the display alias.
	 */
	private bandArtistWikilink(artistTitle: string): string {
		const title = artistTitle.trim();
		const bandModel = new BandModel({
			type: 'band',
			title,
			englishTitle: title,
			year: 0,
			beginYear: '',
			releaseDate: '',
			dataSource: '',
			url: '',
			id: '',
			country: '',
			disambiguation: '',
			genres: [],
			image: '',
			officialWebsite: '',
			subType: 'band',
			userData: { personalRating: 0 },
		});
		const linkTarget = this.plugin.mediaTypeManager.getFileName(bandModel);
		if (linkTarget === title) {
			return `[[${linkTarget}]]`;
		}
		return `[[${linkTarget}|${title}]]`;
	}

	/**
	 * Wikilink for a song's album title using the Music Release file name template; fills artists/year from the song metadata when present.
	 */
	private songAlbumTitleWikilink(albumTitle: string, songMeta: Record<string, unknown>): string {
		const title = albumTitle.trim();
		const artistsRaw = songMeta.artists;
		const artists = Array.isArray(artistsRaw)
			? artistsRaw.filter((a): a is string => typeof a === 'string')
			: [];
		const year = coerceYear(songMeta.year);
		const releaseModel = new MusicReleaseModel({
			type: 'musicRelease',
			title,
			englishTitle: title,
			year,
			releaseDate: '',
			dataSource: '',
			url: '',
			id: '',
			image: '',
			artists,
			genres: [],
			subType: 'album',
			language: '',
			rating: 0,
			userData: { personalRating: 0 },
		});
		const linkTarget = this.plugin.mediaTypeManager.getFileName(releaseModel);
		if (linkTarget === title) {
			return `[[${linkTarget}]]`;
		}
		return `[[${linkTarget}|${title}]]`;
	}
}
