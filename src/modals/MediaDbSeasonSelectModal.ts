import type MediaDbPlugin from '../main';
import { SelectModal } from './SelectModal';

export interface SeasonSelectModalElement {
	season_number: number;
	name: string;
	air_date?: string;
	poster_path?: string;
}

export class MediaDbSeasonSelectModal extends SelectModal<SeasonSelectModalElement> {
	plugin: MediaDbPlugin;
	submitCallback?: (selectedSeasons: SeasonSelectModalElement[]) => void;
	closeCallback?: (err?: Error) => void;
	seriesName?: string;

	constructor(plugin: MediaDbPlugin, seasons: SeasonSelectModalElement[], multiSelect = true, seriesName?: string) {
		super(plugin.app, seasons, multiSelect);
		this.plugin = plugin;
		this.seriesName = seriesName;
		this.title = `Select seasons for${seriesName ? ` ${seriesName}` : ''}`;
		this.description = 'Select one or more seasons to create notes for.';
		this.submitButtonText = 'Create Entry';
	}

	renderElement(season: SeasonSelectModalElement, el: HTMLElement): void {
		el.style.display = 'flex';
		el.style.gap = '8px';
		el.style.alignItems = 'flex-start';

		const thumb = el.createDiv();
		thumb.style.width = '48px';
		thumb.style.height = '72px';
		thumb.style.flex = '0 0 48px';
		thumb.style.overflow = 'hidden';
		thumb.style.background = 'var(--background-modifier-hover)';
		thumb.style.borderRadius = '4px';
		thumb.style.display = 'flex';
		thumb.style.alignItems = 'center';
		thumb.style.justifyContent = 'center';

		if (season.poster_path) {
			const img = document.createElement('img');
			img.src = season.poster_path.startsWith('http') ? season.poster_path : `https://image.tmdb.org/t/p/w780${season.poster_path}`;
			img.loading = 'lazy';
			img.alt = season.name;
			img.style.width = '100%';
			img.style.height = '100%';
			img.style.objectFit = 'cover';
			img.onerror = () => {
				thumb.empty();
				const placeholderSpan = thumb.createEl('span', { text: '\ud83d\udcf7' });
				placeholderSpan.style.fontSize = '24px';
			};
			thumb.appendChild(img);
		} else {
			thumb.createEl('span', { text: '\ud83d\udcf7' }).style.fontSize = '24px';
		}

		const content = el.createDiv();
		content.style.flex = '1';
		content.style.minWidth = '0';
		content.createEl('div', { text: `${season.name}` });
		if (season.air_date) {
			content.createEl('small', { text: `Air date: ${season.air_date}` });
		}
	}

	submit(): void {
		const selected = this.selectModalElements.filter(x => x.isActive()).map(x => x.value);
		this.submitCallback?.(selected);
		this.close();
	}

	skip(): void {
		this.close();
	}

	setSubmitCb(cb: (selectedSeasons: SeasonSelectModalElement[]) => void): void {
		this.submitCallback = cb;
	}

	setCloseCb(cb: (err?: Error) => void): void {
		this.closeCallback = cb;
	}
}
