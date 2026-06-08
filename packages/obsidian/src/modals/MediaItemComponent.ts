export interface MediaItemComponentOptions {
	imageUrl?: string;
	imageAlt?: string;
	onImageError?: () => void;
	onImageLoad?: () => void;
	renderContent: (contentEl: HTMLElement) => void;
}

export class MediaItemComponent {
	private container: HTMLElement;
	private thumbEl!: HTMLElement;
	private contentEl!: HTMLElement;
	private imgEl: HTMLImageElement | undefined;
	private options: MediaItemComponentOptions;

	constructor(container: HTMLElement, options: MediaItemComponentOptions) {
		this.container = container;
		this.options = options;

		this.setup();
	}

	private setup(): void {
		// Set container layout
		this.container.addClass('media-item-component');

		// Create thumbnail
		this.thumbEl = this.container.createDiv({ cls: 'media-item-thumb' });

		// Create content area
		this.contentEl = this.container.createDiv({ cls: 'media-item-content' });

		// Render custom content
		this.options.renderContent(this.contentEl);

		// Setup image if provided
		if (this.options.imageUrl) {
			this.loadImage(this.options.imageUrl);
		} else {
			this.showPlaceholder();
		}
	}

	private loadImage(url: string): void {
		if (!this.imgEl) {
			this.imgEl = document.createElement('img');
			this.imgEl.loading = 'lazy';
			this.imgEl.alt = this.options.imageAlt || 'Media item';
			this.imgEl.className = 'media-item-image';

			this.imgEl.onerror = () => {
				this.showPlaceholder();
				this.options.onImageError?.();
			};

			this.imgEl.onload = () => {
				this.options.onImageLoad?.();
			};

			this.thumbEl.empty();
			this.thumbEl.appendChild(this.imgEl);
		}

		this.imgEl.src = url;
	}

	private showPlaceholder(): void {
		this.thumbEl.empty();
		this.thumbEl.createEl('span', { text: '📷', cls: 'media-item-placeholder' });
	}

	public updateImage(url: string | undefined): void {
		if (url && url !== 'NSFW') {
			if (!String(url).includes('null')) {
				this.loadImage(url);
			} else {
				this.showPlaceholder();
			}
		} else if (url === 'NSFW') {
			this.thumbEl.empty();
			this.thumbEl.createEl('span', { text: 'NSFW', cls: 'media-item-placeholder' });
		} else {
			this.showPlaceholder();
		}
	}

	public getContentElement(): HTMLElement {
		return this.contentEl;
	}
}
