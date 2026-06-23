import { mock } from 'bun:test';

mock.module('obsidian', () => ({
	AbstractInputSuggest: class {},
	Component: class {
		load(): void {}
		unload(): void {}
	},
	DropdownComponent: class {},
	MarkdownRenderer: { render: async (): Promise<void> => {} },
	MarkdownView: class {},
	Modal: class {
		app: unknown;

		constructor(app: unknown) {
			this.app = app;
		}

		open(): void {}
		close(): void {}
	},
	Notice: class {},
	normalizePath: (path: string): string => path,
	moment: Object.assign((value?: unknown): unknown => value, { locale: (): void => {} }),
	parseYaml: (): unknown => ({}),
	Plugin: class {},
	PluginSettingTab: class {},
	requestUrl: async (): Promise<unknown> => ({}),
	SecretComponent: class {},
	Setting: class {},
	SettingGroup: class {},
	stringifyYaml: (value: unknown): string => String(value),
	TFile: class {},
	TFolder: class {},
	TextComponent: class {},
	ToggleComponent: class {},
}));
