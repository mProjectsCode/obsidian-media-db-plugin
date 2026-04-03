import type MediaDbPlugin from '../main';
import { ArtistModel } from '../models/ArtistModel';
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
		const handledKeys = new Set<string>();

		// 1. Process keys exactly in the order of the user's Property Mappings array
		for (const propertyMapping of propertyMappings) {
			const key = propertyMapping.property;
			if (key === 'aliases') {
				handledKeys.add(key);
				continue;
			}
			
			if (Object.hasOwn(obj, key)) {
				const value = obj[key];
				handledKeys.add(key);

				let finalValue = value;
				if (propertyMapping.wikilink) {
					const useArtistFileNameForArtists =
						propertyMapping.property === 'artists' &&
						(internalMediaType === MediaType.Song || internalMediaType === MediaType.MusicRelease);
					const useMusicReleaseFileNameForAlbumTitle =
						propertyMapping.property === 'albumTitle' && internalMediaType === MediaType.Song;

					if (typeof value === 'string') {
						if (useArtistFileNameForArtists) {
							finalValue = this.artistTitleWikilink(value);
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
							if (useArtistFileNameForArtists) {
								return this.artistTitleWikilink(v);
							}
							if (useMusicReleaseFileNameForAlbumTitle) {
								return this.songAlbumTitleWikilink(v, obj);
							}
							return `[[${v}]]`;
						});
					}
				}

				if (propertyMapping.mapping === PropertyMappingOption.Map) {
					newObj[propertyMapping.newProperty] = finalValue;
				} else if (propertyMapping.mapping === PropertyMappingOption.Remove) {
					// do nothing
				} else if (propertyMapping.mapping === PropertyMappingOption.Default) {
					newObj[key] = finalValue;
				}
			}
		}

		// 2. Append any remaining unmatched keys from obj (to preserve unhandled data)
		for (const [key, value] of Object.entries(obj)) {
			if (!handledKeys.has(key) && key !== 'aliases') {
				newObj[key] = value;
			}
		}

		// 3. Handle aliases
		if (Object.hasOwn(obj, 'aliases')) {
			const aliasesPm = propertyMappings.find(p => p.property === 'aliases');
			if (aliasesPm?.mapping !== PropertyMappingOption.Remove) {
				const incoming = obj['aliases'];
				const targetKey =
					aliasesPm?.mapping === PropertyMappingOption.Map && aliasesPm.newProperty
						? aliasesPm.newProperty
						: 'aliases';
				const merged = PropertyMapper.mergeAliasValues(newObj[targetKey], incoming);
				if (merged.length > 0) {
					newObj[targetKey] = merged;
				}
			}
		}

		return newObj;
	}

	getPinnedBottomKeys(type: unknown): string[] {
		const internalMediaType = resolveMetadataTypeToMediaType(this.plugin.settings, type);
		if (!internalMediaType) return [];

		const propertyMappingModel = this.plugin.settings.propertyMappingModels.find(x => x.type === internalMediaType);
		if (!propertyMappingModel) return [];

		const pinnedKeys: string[] = [];
		for (const mapping of propertyMappingModel.properties) {
			if (mapping.pinBottom) {
				// The key to pin is the NEW key if mapped
				if (mapping.mapping === PropertyMappingOption.Map) {
					pinnedKeys.push(mapping.newProperty);
				} else if (mapping.mapping === PropertyMappingOption.Default) {
					pinnedKeys.push(mapping.property);
				}
			}
		}
		return pinnedKeys;
	}

	getAutoTagKeys(type: unknown): { key: string; prefix: string }[] {
		const internalMediaType = resolveMetadataTypeToMediaType(this.plugin.settings, type);
		if (!internalMediaType) return [];

		const propertyMappingModel = this.plugin.settings.propertyMappingModels.find(x => x.type === internalMediaType);
		if (!propertyMappingModel) return [];

		const autoTagKeys: { key: string; prefix: string }[] = [];
		for (const mapping of propertyMappingModel.properties) {
			if (mapping.autoTag && mapping.mapping !== PropertyMappingOption.Remove) {
				const key = mapping.mapping === PropertyMappingOption.Map ? mapping.newProperty : mapping.property;
				autoTagKeys.push({ key, prefix: mapping.autoTagPrefix ?? '' });
			}
		}
		return autoTagKeys;
	}

	private static mergeAliasValues(existing: unknown, added: unknown): string[] {
		const toStrings = (v: unknown): string[] => {
			if (v == null) {
				return [];
			}
			if (Array.isArray(v)) {
				return v.flatMap(x => (typeof x === 'string' ? x : String(x))).filter(s => s.length > 0);
			}
			if (typeof v === 'string') {
				return v.length > 0 ? [v] : [];
			}
			return [];
		};

		const combined = [...toStrings(existing), ...toStrings(added)];
		const seen = new Set<string>();
		const out: string[] = [];
		for (const s of combined) {
			if (!seen.has(s)) {
				seen.add(s);
				out.push(s);
			}
		}
		return out;
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
	 * Wikilink for an artist name using the Artist file name template as the link target and the raw artist title as the display alias.
	 */
	private artistTitleWikilink(artistTitle: string): string {
		const title = artistTitle.trim();
		const artistModel = new ArtistModel({
			type: 'artist',
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
			isni: '',
			genres: [],
			image: '',
			officialWebsite: '',
			subType: 'artist',
			userData: { personalRating: 0 },
		});
		const linkTarget = this.plugin.mediaTypeManager.getFileName(artistModel);
		if (linkTarget === title) {
			return `[[${linkTarget}]]`;
		}
		return `[[${linkTarget}|${title}]]`;
	}

	/**
	 * Wikilink for a song's release title using the Music Release file name template; fills artists/year from the song metadata when present.
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
