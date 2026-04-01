import type MediaDbPlugin from '../main';
import { noteTypeValueForMedia, resolveMetadataTypeToMediaType } from '../utils/noteTypeSettings';
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

		const entityProps = this.plugin.settings.autoTagEntities.split(',').map(s => s.trim().toLowerCase()).filter(s => s);

		// 1. Preprocess global wiki-links on the raw object first
		if (this.plugin.settings.enableWikiLinkParsing && entityProps.length > 0) {
			for (const [key, value] of Object.entries(obj)) {
				if (key === 'aliases') continue;
				if (entityProps.includes(key.toLowerCase())) {
					const folderPrefix = this.plugin.settings.wikiFolder ? `${this.plugin.settings.wikiFolder}/` : '';
					const formatWiki = (v: unknown) => {
						if (typeof v !== 'string') return v;
						let clean = v.replace(/^\[\[(.*?)\]\]$/, '$1');
						if (clean.includes('|')) clean = clean.split('|')[1];
						return `[[${folderPrefix}${clean}|${clean}]]`;
					};

					if (typeof value === 'string') {
						obj[key] = formatWiki(value);
					} else if (Array.isArray(value)) {
						obj[key] = value.map(formatWiki);
					}
				}
			}
		}

		// 2. Map standard properties
		for (const [key, value] of Object.entries(obj)) {
			if (key === 'aliases') {
				continue;
			}
			for (const propertyMapping of propertyMappings) {
				if (propertyMapping.property === key) {
					let finalValue = value;
					if (propertyMapping.wikilink) {
						const folderPrefix = this.plugin.settings.wikiFolder ? `${this.plugin.settings.wikiFolder}/` : '';
						// Resolve the originating API so it can provide property-specific link formatting
						const api = typeof obj.dataSource === 'string'
							? this.plugin.apiManager.getApiByName(obj.dataSource)
							: undefined;
						const wikilink = (v: unknown): unknown => {
							if (typeof v !== 'string') return v;
							if (api) return api.wikilinkValueFor(key, v, obj, folderPrefix);
							const clean = v.replace(/^\[\[(.*?)\]\]$/, '$1').split('|').pop()!;
							return `[[${folderPrefix}${clean}|${clean}]]`;
						};
						if (typeof value === 'string') {
							finalValue = wikilink(value);
						} else if (Array.isArray(value)) {
							finalValue = value.map(wikilink);
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

}
