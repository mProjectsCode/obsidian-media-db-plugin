export interface MediaItemComponentOptions {
	imageUrl?: string;
	imageAlt?: string;
	onImageError?: () => void;
	onImageLoad?: () => void;
	renderContent: (contentEl: HTMLElement) => void;
}

export class MediaItemComponent {
	private container: HTMLElement;
	private thumbEl: HTMLElement;
	private contentEl: HTMLElement;
	private imgEl: HTMLImageElement | undefined;
	private options: MediaItemComponentOptions;

	constructor(container: HTMLElement, options: MediaItemComponentOptions) {
		this.container = container;
		this.options = options;
		this.thumbEl = null as any; // Will be initialized in setup
		this.contentEl = null as any;

		this.setup();
	}

	private setup(): void {
		// Set container layout
		this.container.addClass('media-item-component');
		this.container.style.display = 'flex';
		this.container.style.gap = '8px';
		this.container.style.alignItems = 'flex-start';

		// Create thumbnail
		this.thumbEl = this.container.createDiv({ cls: 'media-item-thumb' });
		this.thumbEl.style.width = '48px';
		this.thumbEl.style.height = '72px';
		this.thumbEl.style.flex = '0 0 48px';
		this.thumbEl.style.overflow = 'hidden';
		this.thumbEl.style.background = 'var(--background-modifier-hover)';
		this.thumbEl.style.borderRadius = '4px';
		this.thumbEl.style.display = 'flex';
		this.thumbEl.style.alignItems = 'center';
		this.thumbEl.style.justifyContent = 'center';

		// Create content area
		this.contentEl = this.container.createDiv({ cls: 'media-item-content' });
		this.contentEl.style.flex = '1';
		this.contentEl.style.minWidth = '0';

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
			this.imgEl.style.width = '100%';
			this.imgEl.style.height = '100%';
			this.imgEl.style.objectFit = 'cover';
			this.imgEl.style.display = 'block';

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
		const span = this.thumbEl.createEl('span', { text: '📷' });
		span.style.fontSize = '24px';
		span.style.color = 'var(--text-muted)';
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
			this.thumbEl.createEl('span', { text: 'NSFW' });
		} else {
			this.showPlaceholder();
		}
	}

	public getContentElement(): HTMLElement {
		return this.contentEl;
	}
}
