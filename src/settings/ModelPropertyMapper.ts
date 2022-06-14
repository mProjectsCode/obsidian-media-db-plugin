import {MediaType} from '../utils/MediaType';
import {MediaDbPluginSettings} from './Settings';
import {ModelPropertyConversionRule} from './ModelPropertyConversionRule';

export class ModelPropertyMapper {
	conversionRulesMap: Map<MediaType, string>;

	constructor(settings: MediaDbPluginSettings) {
		this.updateConversionRules(settings);
	}

	updateConversionRules(settings: MediaDbPluginSettings) {
		this.conversionRulesMap = new Map<MediaType, string>();
		this.conversionRulesMap.set(MediaType.Movie, settings.moviePropertyConversionRules);
		this.conversionRulesMap.set(MediaType.Series, settings.seriesPropertyConversionRules);
		this.conversionRulesMap.set(MediaType.Game, settings.gamePropertyConversionRules);
		this.conversionRulesMap.set(MediaType.Wiki, settings.wikiPropertyConversionRules);
		this.conversionRulesMap.set(MediaType.MusicRelease, settings.musicReleasePropertyConversionRules);
	}

	convertObject(obj: object): object {
		if (!obj.hasOwnProperty('type')) {
			return obj;
		}

		// @ts-ignore
		const conversionRulesString: string = this.conversionRulesMap.get(obj['type']);
		if (!conversionRulesString) {
			return obj;
		}

		const conversionRules: ModelPropertyConversionRule[] = [];
		for (const conversionRuleString of conversionRulesString.split('\n')) {
			if (conversionRuleString) {
				conversionRules.push(new ModelPropertyConversionRule(conversionRuleString));
			}
		}

		const newObj: object = {};


		for (const [key, value] of Object.entries(obj)) {
			if (key === 'type') {
				// @ts-ignore
				newObj[key] = value;
				continue;
			}

			let hasConversionRule = false;
			for (const conversionRule of conversionRules) {
				if (conversionRule.property === key) {
					hasConversionRule = true;
					// @ts-ignore
					newObj[conversionRule.newProperty] = value;
				}
			}
			if (!hasConversionRule) {
				// @ts-ignore
				newObj[key] = value;
			}
		}

		return newObj;
	}

	convertObjectBack(obj: object): object {
		if (!obj.hasOwnProperty('type')) {
			return obj;
		}

		// @ts-ignore
		const conversionRulesString: string = this.conversionRulesMap.get(obj['type']);
		if (!conversionRulesString) {
			return obj;
		}

		const conversionRules: ModelPropertyConversionRule[] = [];
		for (const conversionRuleString of conversionRulesString.split('\n')) {
			if (conversionRuleString) {
				conversionRules.push(new ModelPropertyConversionRule(conversionRuleString));
			}
		}

		const originalObj: object = {};

		for (const [key, value] of Object.entries(obj)) {
			if (key === 'type') {
				// @ts-ignore
				originalObj[key] = value;
				continue;
			}

			let hasConversionRule = false;
			for (const conversionRule of conversionRules) {
				if (conversionRule.newProperty === key) {
					hasConversionRule = true;
					// @ts-ignore
					originalObj[conversionRule.property] = value;
				}
			}
			if (!hasConversionRule) {
				// @ts-ignore
				originalObj[key] = value;
			}
		}

		return originalObj;
	}
}
