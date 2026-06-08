import type MediaDbPlugin from 'packages/obsidian/src/main';
import { MediaItemComponent } from 'packages/obsidian/src/modals/MediaItemComponent';
import { SelectModal } from 'packages/obsidian/src/modals/SelectModal';

export interface SeasonSelectModalElement {
	season_number: number;
	name: string;
	episode_count?: number;
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
		new MediaItemComponent(el, {
			imageUrl: season.poster_path ? (season.poster_path.startsWith('http') ? season.poster_path : `https://image.tmdb.org/t/p/w780${season.poster_path}`) : undefined,
			imageAlt: season.name,
			renderContent: (contentEl: HTMLElement): void => {
				contentEl.createDiv({ text: `${season.name}` });
				if (season.air_date) {
					contentEl.createEl('small', { text: `Air date: ${season.air_date}` });
				}
			},
		});
	}

	submit(): void {
		const selected = this.selectModalElements.filter(x => x.isActive()).map(x => x.value);
		this.submitCallback?.(selected);
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

	onClose(): void {
		this.closeCallback?.();
		super.onClose();
	}
}
