import type { Setting } from 'obsidian';

declare module 'obsidian' {
	/**
	 * Settings section container (Obsidian 1.6+). Types lag the runtime API.
	 */
	export class SettingGroup {
		constructor(containerEl: HTMLElement);
		setHeading(name: string): this;
		addSetting(cb: (setting: Setting) => unknown): void;
	}
}
