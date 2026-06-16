import { UserConfig, defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import banner from 'vite-plugin-banner';
import path from 'path';
import { builtinModules } from 'node:module';
import { dtsBundlePlugin, getBuildBanner } from '@lemons_dev/lemons-obsidian-plugin-automation';
import manifest from './manifest.json' with { type: 'json' };

const entryFile = 'packages/obsidian/src/main.ts';

export default defineConfig(async ({ mode }) => {
	const prod = mode === 'production';
	const outDir = prod ? 'dist/' : `exampleVault/.obsidian/plugins/${manifest.id}/`;

	let plugins = [
		banner({
			outDir: outDir,
			content: getBuildBanner(prod ? 'Release Build' : 'Dev Build', version => version),
		}),
		viteStaticCopy({
			targets: [
				{
					src: 'manifest.json',
					dest: outDir,
				},
			],
		}),
	];

	return {
		plugins: plugins,
		resolve: {
			alias: {
				packages: path.resolve(__dirname, './packages'),
			},
		},
		define: {
			// Disable all logs and debug statements in production, but keep warnings and errors
			__LOG_LEVEL__: prod ? 2 : 4,
		},
		build: {
			lib: {
				entry: path.resolve(__dirname, entryFile),
				name: 'main',
				fileName: () => 'main.js',
				formats: ['cjs'],
			},
			minify: prod,
			target: 'es2022',
			sourcemap: prod ? false : 'inline',
			cssCodeSplit: false,
			emptyOutDir: false,
			outDir: '',
			rolldownOptions: {
				input: {
					main: path.resolve(__dirname, entryFile),
				},
				output: {
					dir: outDir,
					entryFileNames: 'main.js',
					assetFileNames: 'styles.css',
				},
				external: [
					'obsidian',
					'electron',
					'@codemirror/autocomplete',
					'@codemirror/collab',
					'@codemirror/commands',
					'@codemirror/language',
					'@codemirror/lint',
					'@codemirror/search',
					'@codemirror/state',
					'@codemirror/view',
					'@lezer/common',
					'@lezer/highlight',
					'@lezer/lr',
					...builtinModules,
				],
			},
		},
	} as UserConfig;
});
