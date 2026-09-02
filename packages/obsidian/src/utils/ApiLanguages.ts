export const INHERIT_LANGUAGE = 'inherit';

export interface LanguageOption {
	id: string;
	name: string;
	nativeName: string;
}

export type MalTitlePreference = 'default' | 'english' | 'japanese';

export interface ApiLanguageSettings {
	metadataLanguage: string;
	tmdbLanguage: string;
	wikipediaLanguage: string;
	steamLanguage: string;
	vndbLanguage: string;
	openLibraryLanguage: string;
	malTitleLanguage: string;
}

type LanguageTuple = [id: string, name: string, nativeName?: string];

function lang(id: string, name: string, nativeName?: string): LanguageOption {
	return { id, name, nativeName: nativeName ?? name };
}

function fromTuples(rows: LanguageTuple[]): LanguageOption[] {
	return rows.map(([id, name, nativeName]) => lang(id, name, nativeName));
}

function compareLanguages(a: LanguageOption, b: LanguageOption): number {
	return a.name.localeCompare(b.name, 'en');
}

/**
 * ISO 639-1 languages plus common regional variants used as the global metadata language list.
 */
const ISO_LANGUAGES: LanguageTuple[] = [
	['aa', 'Afar', 'Afar'],
	['ab', 'Abkhazian', 'Аԥсшәа'],
	['ae', 'Avestan', 'Avesta'],
	['af', 'Afrikaans', 'Afrikaans'],
	['ak', 'Akan', 'Akan'],
	['am', 'Amharic', 'አማርኛ'],
	['an', 'Aragonese', 'Aragonés'],
	['ar', 'Arabic', 'العربية'],
	['as', 'Assamese', 'অসমীয়া'],
	['av', 'Avaric', 'Авар'],
	['ay', 'Aymara', 'Aymar'],
	['az', 'Azerbaijani', 'Azərbaycan'],
	['ba', 'Bashkir', 'Башҡорт'],
	['be', 'Belarusian', 'Беларуская'],
	['bg', 'Bulgarian', 'Български'],
	['bi', 'Bislama', 'Bislama'],
	['bm', 'Bambara', 'Bamanankan'],
	['bn', 'Bengali', 'বাংলা'],
	['bo', 'Tibetan', 'བོད་ཡིག'],
	['br', 'Breton', 'Brezhoneg'],
	['bs', 'Bosnian', 'Bosanski'],
	['ca', 'Catalan', 'Català'],
	['ce', 'Chechen', 'Нохчийн'],
	['ch', 'Chamorro', 'Chamoru'],
	['co', 'Corsican', 'Corsu'],
	['cr', 'Cree', 'ᓀᐦᐃᔭᐍᐏᐣ'],
	['cs', 'Czech', 'Čeština'],
	['cu', 'Church Slavic', 'Словѣньскъ'],
	['cv', 'Chuvash', 'Чӑваш'],
	['cy', 'Welsh', 'Cymraeg'],
	['da', 'Danish', 'Dansk'],
	['de', 'German', 'Deutsch'],
	['dv', 'Divehi', 'ދިވެހި'],
	['dz', 'Dzongkha', 'རྫོང་ཁ'],
	['ee', 'Ewe', 'Eʋegbe'],
	['el', 'Greek', 'Ελληνικά'],
	['en', 'English', 'English'],
	['eo', 'Esperanto', 'Esperanto'],
	['es', 'Spanish', 'Español'],
	['et', 'Estonian', 'Eesti'],
	['eu', 'Basque', 'Euskara'],
	['fa', 'Persian', 'فارسی'],
	['ff', 'Fulah', 'Fulfulde'],
	['fi', 'Finnish', 'Suomi'],
	['fj', 'Fijian', 'Na Vosa Vakaviti'],
	['fo', 'Faroese', 'Føroyskt'],
	['fr', 'French', 'Français'],
	['fy', 'Western Frisian', 'Frysk'],
	['ga', 'Irish', 'Gaeilge'],
	['gd', 'Scottish Gaelic', 'Gàidhlig'],
	['gl', 'Galician', 'Galego'],
	['gn', 'Guarani', "Avañe'ẽ"],
	['gu', 'Gujarati', 'ગુજરાતી'],
	['gv', 'Manx', 'Gaelg'],
	['ha', 'Hausa', 'Hausa'],
	['he', 'Hebrew', 'עברית'],
	['hi', 'Hindi', 'हिन्दी'],
	['ho', 'Hiri Motu', 'Hiri Motu'],
	['hr', 'Croatian', 'Hrvatski'],
	['ht', 'Haitian Creole', 'Kreyòl ayisyen'],
	['hu', 'Hungarian', 'Magyar'],
	['hy', 'Armenian', 'Հայերեն'],
	['hz', 'Herero', 'Otjiherero'],
	['ia', 'Interlingua', 'Interlingua'],
	['id', 'Indonesian', 'Bahasa Indonesia'],
	['ie', 'Interlingue', 'Interlingue'],
	['ig', 'Igbo', 'Igbo'],
	['ii', 'Sichuan Yi', 'ꆈꌠꉙ'],
	['ik', 'Inupiaq', 'Iñupiaq'],
	['io', 'Ido', 'Ido'],
	['is', 'Icelandic', 'Íslenska'],
	['it', 'Italian', 'Italiano'],
	['iu', 'Inuktitut', 'ᐃᓄᒃᑎᑐᑦ'],
	['ja', 'Japanese', '日本語'],
	['jv', 'Javanese', 'Basa Jawa'],
	['ka', 'Georgian', 'ქართული'],
	['kg', 'Kongo', 'Kikongo'],
	['ki', 'Kikuyu', 'Gĩkũyũ'],
	['kj', 'Kuanyama', 'Kuanyama'],
	['kk', 'Kazakh', 'Қазақша'],
	['kl', 'Kalaallisut', 'Kalaallisut'],
	['km', 'Khmer', 'ខ្មែរ'],
	['kn', 'Kannada', 'ಕನ್ನಡ'],
	['ko', 'Korean', '한국어'],
	['kr', 'Kanuri', 'Kanuri'],
	['ks', 'Kashmiri', 'कॉशुर'],
	['ku', 'Kurdish', 'Kurdî'],
	['kv', 'Komi', 'Коми'],
	['kw', 'Cornish', 'Kernewek'],
	['ky', 'Kyrgyz', 'Кыргызча'],
	['la', 'Latin', 'Latina'],
	['lb', 'Luxembourgish', 'Lëtzebuergesch'],
	['lg', 'Ganda', 'Luganda'],
	['li', 'Limburgan', 'Limburgs'],
	['ln', 'Lingala', 'Lingála'],
	['lo', 'Lao', 'ລາວ'],
	['lt', 'Lithuanian', 'Lietuvių'],
	['lu', 'Luba-Katanga', 'Tshiluba'],
	['lv', 'Latvian', 'Latviešu'],
	['mg', 'Malagasy', 'Malagasy'],
	['mh', 'Marshallese', 'Kajin M̧ajeļ'],
	['mi', 'Māori', 'Māori'],
	['mk', 'Macedonian', 'Македонски'],
	['ml', 'Malayalam', 'മലയാളം'],
	['mn', 'Mongolian', 'Монгол'],
	['mr', 'Marathi', 'मराठी'],
	['ms', 'Malay', 'Bahasa Melayu'],
	['mt', 'Maltese', 'Malti'],
	['my', 'Burmese', 'မြန်မာ'],
	['na', 'Nauru', 'Dorerin Naoero'],
	['nb', 'Norwegian Bokmål', 'Norsk bokmål'],
	['nd', 'North Ndebele', 'isiNdebele'],
	['ne', 'Nepali', 'नेपाली'],
	['ng', 'Ndonga', 'Owambo'],
	['nl', 'Dutch', 'Nederlands'],
	['nn', 'Norwegian Nynorsk', 'Norsk nynorsk'],
	['no', 'Norwegian', 'Norsk'],
	['nr', 'South Ndebele', 'isiNdebele'],
	['nv', 'Navajo', 'Diné bizaad'],
	['ny', 'Chichewa', 'Chichewa'],
	['oc', 'Occitan', 'Occitan'],
	['oj', 'Ojibwa', 'ᐊᓂᔑᓈᐯᒧᐎᓐ'],
	['om', 'Oromo', 'Afaan Oromoo'],
	['or', 'Odia', 'ଓଡ଼ିଆ'],
	['os', 'Ossetian', 'Ирон'],
	['pa', 'Punjabi', 'ਪੰਜਾਬੀ'],
	['pi', 'Pali', 'पालि'],
	['pl', 'Polish', 'Polski'],
	['ps', 'Pashto', 'پښتو'],
	['pt', 'Portuguese', 'Português'],
	['qu', 'Quechua', 'Runa Simi'],
	['rm', 'Romansh', 'Rumantsch'],
	['rn', 'Rundi', 'Ikirundi'],
	['ro', 'Romanian', 'Română'],
	['ru', 'Russian', 'Русский'],
	['rw', 'Kinyarwanda', 'Ikinyarwanda'],
	['sa', 'Sanskrit', 'संस्कृतम्'],
	['sc', 'Sardinian', 'Sardu'],
	['sd', 'Sindhi', 'سنڌي'],
	['se', 'Northern Sami', 'Davvisámegiella'],
	['sg', 'Sango', 'Sängö'],
	['si', 'Sinhala', 'සිංහල'],
	['sk', 'Slovak', 'Slovenčina'],
	['sl', 'Slovenian', 'Slovenščina'],
	['sm', 'Samoan', 'Gagana Samoa'],
	['sn', 'Shona', 'chiShona'],
	['so', 'Somali', 'Soomaali'],
	['sq', 'Albanian', 'Shqip'],
	['sr', 'Serbian', 'Српски'],
	['ss', 'Swati', 'SiSwati'],
	['st', 'Southern Sotho', 'Sesotho'],
	['su', 'Sundanese', 'Basa Sunda'],
	['sv', 'Swedish', 'Svenska'],
	['sw', 'Swahili', 'Kiswahili'],
	['ta', 'Tamil', 'தமிழ்'],
	['te', 'Telugu', 'తెలుగు'],
	['tg', 'Tajik', 'Тоҷикӣ'],
	['th', 'Thai', 'ไทย'],
	['ti', 'Tigrinya', 'ትግርኛ'],
	['tk', 'Turkmen', 'Türkmençe'],
	['tl', 'Tagalog', 'Tagalog'],
	['tn', 'Tswana', 'Setswana'],
	['to', 'Tonga', 'lea faka-Tonga'],
	['tr', 'Turkish', 'Türkçe'],
	['ts', 'Tsonga', 'Xitsonga'],
	['tt', 'Tatar', 'Татар'],
	['tw', 'Twi', 'Twi'],
	['ty', 'Tahitian', 'Reo Tahiti'],
	['ug', 'Uyghur', 'ئۇيغۇرچە'],
	['uk', 'Ukrainian', 'Українська'],
	['ur', 'Urdu', 'اردو'],
	['uz', 'Uzbek', 'Oʻzbekcha'],
	['ve', 'Venda', 'Tshivenḓa'],
	['vi', 'Vietnamese', 'Tiếng Việt'],
	['vo', 'Volapük', 'Volapük'],
	['wa', 'Walloon', 'Walon'],
	['wo', 'Wolof', 'Wolof'],
	['xh', 'Xhosa', 'isiXhosa'],
	['yi', 'Yiddish', 'ייִדיש'],
	['yo', 'Yoruba', 'Yorùbá'],
	['za', 'Zhuang', 'Vahcuengh'],
	['zh', 'Chinese', '中文'],
	['zu', 'Zulu', 'isiZulu'],
];

const REGIONAL_LANGUAGES: LanguageTuple[] = [
	['ar-SA', 'Arabic (Saudi Arabia)', 'العربية (السعودية)'],
	['de-AT', 'German (Austria)', 'Deutsch (Österreich)'],
	['de-CH', 'German (Switzerland)', 'Deutsch (Schweiz)'],
	['de-DE', 'German (Germany)', 'Deutsch (Deutschland)'],
	['en-AU', 'English (Australia)', 'English (Australia)'],
	['en-CA', 'English (Canada)', 'English (Canada)'],
	['en-GB', 'English (United Kingdom)', 'English (UK)'],
	['en-US', 'English (United States)', 'English (US)'],
	['es-419', 'Spanish (Latin America)', 'Español (Latinoamérica)'],
	['es-AR', 'Spanish (Argentina)', 'Español (Argentina)'],
	['es-ES', 'Spanish (Spain)', 'Español (España)'],
	['es-MX', 'Spanish (Mexico)', 'Español (México)'],
	['fr-CA', 'French (Canada)', 'Français (Canada)'],
	['fr-FR', 'French (France)', 'Français (France)'],
	['it-IT', 'Italian (Italy)', 'Italiano (Italia)'],
	['ja-JP', 'Japanese (Japan)', '日本語（日本）'],
	['ko-KR', 'Korean (Korea)', '한국어 (한국)'],
	['nl-BE', 'Dutch (Belgium)', 'Nederlands (België)'],
	['nl-NL', 'Dutch (Netherlands)', 'Nederlands (Nederland)'],
	['pt-BR', 'Portuguese (Brazil)', 'Português (Brasil)'],
	['pt-PT', 'Portuguese (Portugal)', 'Português (Portugal)'],
	['zh-CN', 'Chinese (Simplified)', '简体中文'],
	['zh-HK', 'Chinese (Hong Kong)', '繁體中文（香港）'],
	['zh-TW', 'Chinese (Traditional)', '繁體中文'],
];

const WIKIPEDIA_EXTRA: LanguageTuple[] = [
	['als', 'Alemannic German', 'Alemannisch'],
	['ang', 'Old English', 'Ænglisc'],
	['anp', 'Angika', 'अङ्गिका'],
	['arc', 'Aramaic', 'ܐܪܡܝܐ'],
	['ary', 'Moroccan Arabic', 'الدارجة'],
	['arz', 'Egyptian Arabic', 'مصرى'],
	['ast', 'Asturian', 'Asturianu'],
	['atj', 'Atikamekw', 'Atikamekw'],
	['avk', 'Kotava', 'Kotava'],
	['awa', 'Awadhi', 'अवधी'],
	['azb', 'South Azerbaijani', 'تۆرکجه'],
	['ban', 'Balinese', 'Basa Bali'],
	['bar', 'Bavarian', 'Boarisch'],
	['bat-smg', 'Samogitian', 'Žemaitėška'],
	['bcl', 'Central Bikol', 'Bikol Central'],
	['be-tarask', 'Belarusian (Taraškievica)', 'Беларуская (тарашкевіца)'],
	['bh', 'Bihari', 'भोजपुरी'],
	['bho', 'Bhojpuri', 'भोजपुरी'],
	['bjn', 'Banjar', 'Bahasa Banjar'],
	['blk', "Pa'O", 'ပအိုဝ်ႏဘာႏသာႏ'],
	['bpy', 'Bishnupriya Manipuri', 'বিষ্ণুপ্রিয়া মণিপুরী'],
	['bug', 'Buginese', 'ᨅᨔ ᨕᨘᨁᨗ'],
	['bxr', 'Russia Buriat', 'Буряад'],
	['cbk-zam', 'Zamboanga Chavacano', 'Chavacano de Zamboanga'],
	['cdo', 'Min Dong', '閩東語'],
	['ceb', 'Cebuano', 'Sinugboanon'],
	['chr', 'Cherokee', 'ᏣᎳᎩ'],
	['ckb', 'Central Kurdish', 'کوردی'],
	['crh', 'Crimean Tatar', 'Qırımtatarca'],
	['csb', 'Kashubian', 'Kaszëbsczi'],
	['dag', 'Dagbani', 'Dagbanli'],
	['diq', 'Zazaki', 'Zazaki'],
	['dsb', 'Lower Sorbian', 'Dolnoserbšćina'],
	['dty', 'Doteli', 'डोटेली'],
	['eml', 'Emilian-Romagnol', 'Emiliàn e rumagnòl'],
	['ext', 'Extremaduran', 'Estremeñu'],
	['fiu-vro', 'Võro', 'Võro'],
	['frp', 'Franco-Provençal', 'Arpetan'],
	['frr', 'Northern Frisian', 'Nordfriisk'],
	['fur', 'Friulian', 'Furlan'],
	['gag', 'Gagauz', 'Gagauz'],
	['gan', 'Gan Chinese', '贛語'],
	['gcr', 'Guianan Creole', 'Kriyòl gwiyannen'],
	['glk', 'Gilaki', 'گیلکی'],
	['gom', 'Goan Konkani', 'गोंयची कोंकणी'],
	['gor', 'Gorontalo', 'Bahasa Hulontalo'],
	['hak', 'Hakka', '客家語'],
	['haw', 'Hawaiian', 'Hawaiʻi'],
	['hif', 'Fiji Hindi', 'Fiji Hindi'],
	['hsb', 'Upper Sorbian', 'Hornjoserbšćina'],
	['hyw', 'Western Armenian', 'Արեւմտահայերէն'],
	['ilo', 'Iloko', 'Ilokano'],
	['inh', 'Ingush', 'ГӀалгӀай'],
	['jam', 'Jamaican Patois', 'Patois'],
	['jbo', 'Lojban', 'la .lojban.'],
	['kaa', 'Kara-Kalpak', 'Qaraqalpaqsha'],
	['kab', 'Kabyle', 'Taqbaylit'],
	['kbd', 'Kabardian', 'Адыгэбзэ'],
	['kbp', 'Kabiye', 'Kabɩyɛ'],
	['koi', 'Komi-Permyak', 'Перем коми'],
	['krc', 'Karachay-Balkar', 'Къарачай-малкъар'],
	['ksh', 'Colognian', 'Ripoarisch'],
	['lad', 'Ladino', 'Ladino'],
	['lbe', 'Lak', 'Лакку'],
	['lez', 'Lezghian', 'Лезги'],
	['lfn', 'Lingua Franca Nova', 'Lingua Franca Nova'],
	['lij', 'Ligurian', 'Ligure'],
	['lld', 'Ladin', 'Ladin'],
	['lmo', 'Lombard', 'Lombard'],
	['ltg', 'Latgalian', 'Latgaļu'],
	['lzh', 'Classical Chinese', '文言'],
	['mai', 'Maithili', 'मैथिली'],
	['map-bms', 'Banyumasan', 'Basa Banyumasan'],
	['mdf', 'Moksha', 'Мокшень'],
	['mhr', 'Eastern Mari', 'Олык марий'],
	['min', 'Minangkabau', 'Baso Minangkabau'],
	['mnw', 'Mon', 'ဘာသာမန်'],
	['mrj', 'Western Mari', 'Кырык мары'],
	['mwl', 'Mirandese', 'Mirandés'],
	['myv', 'Erzya', 'Эрзянь'],
	['mzn', 'Mazanderani', 'مازِرونی'],
	['nah', 'Nahuatl', 'Nāhuatl'],
	['nan', 'Min Nan', 'Bân-lâm-gú'],
	['nap', 'Neapolitan', 'Napulitano'],
	['nds', 'Low German', 'Plattdüütsch'],
	['nds-nl', 'Dutch Low Saxon', 'Nedersaksies'],
	['new', 'Newari', 'नेपाल भाषा'],
	['nov', 'Novial', 'Novial'],
	['nrm', 'Norman', 'Nouormand'],
	['nso', 'Northern Sotho', 'Sesotho sa Leboa'],
	['olo', 'Livvi-Karelian', 'Livvin kieli'],
	['pag', 'Pangasinan', 'Pangasinan'],
	['pam', 'Pampanga', 'Kapampangan'],
	['pap', 'Papiamento', 'Papiamentu'],
	['pcd', 'Picard', 'Picard'],
	['pdc', 'Pennsylvania German', 'Deitsch'],
	['pfl', 'Palatine German', 'Pälzisch'],
	['pih', 'Norfuk / Pitkern', 'Norfuk'],
	['pms', 'Piedmontese', 'Piemontèis'],
	['pnb', 'Western Punjabi', 'پنجابی'],
	['pnt', 'Pontic', 'Ποντιακά'],
	['pwn', 'Paiwan', 'Pinayuanan'],
	['rmy', 'Vlax Romani', 'Romani'],
	['roa-rup', 'Aromanian', 'Armãneashti'],
	['roa-tara', 'Tarantino', 'Tarandíne'],
	['rue', 'Rusyn', 'Русиньскый'],
	['sah', 'Yakut', 'Саха тыла'],
	['sat', 'Santali', 'ᱥᱟᱱᱛᱟᱲᱤ'],
	['scn', 'Sicilian', 'Sicilianu'],
	['sco', 'Scots', 'Scots'],
	['sh', 'Serbo-Croatian', 'Srpskohrvatski'],
	['shi', 'Tachelhit', 'Taclḥit'],
	['simple', 'Simple English', 'Simple English'],
	['skr', 'Saraiki', 'سرائیکی'],
	['srn', 'Sranan Tongo', 'Sranantongo'],
	['stq', 'Saterland Frisian', 'Seeltersk'],
	['szl', 'Silesian', 'Ślůnski'],
	['szy', 'Sakizaya', 'Sakizaya'],
	['tcy', 'Tulu', 'ತುಳು'],
	['tet', 'Tetum', 'Tetun'],
	['tly', 'Talysh', 'Tolışi'],
	['tpi', 'Tok Pisin', 'Tok Pisin'],
	['tyv', 'Tuvan', 'Тыва дыл'],
	['udm', 'Udmurt', 'Удмурт'],
	['vec', 'Venetian', 'Vèneto'],
	['vep', 'Veps', 'Vepsän kel’'],
	['vls', 'West Flemish', 'West-Vlams'],
	['war', 'Waray', 'Winaray'],
	['wuu', 'Wu Chinese', '吴语'],
	['xal', 'Kalmyk', 'Хальмг'],
	['xmf', 'Mingrelian', 'მარგალური'],
	['zea', 'Zeelandic', 'Zeêuws'],
	['zgh', 'Standard Moroccan Tamazight', 'ⵜⴰⵎⴰⵣⵉⵖⵜ'],
	['zh-classical', 'Classical Chinese', '文言'],
	['zh-min-nan', 'Min Nan', 'Bân-lâm-gú'],
	['zh-yue', 'Cantonese', '粵語'],
];

const STEAM_LANGUAGE_TUPLES: LanguageTuple[] = [
	['arabic', 'Arabic', 'العربية'],
	['brazilian', 'Portuguese (Brazil)', 'Português-Brasil'],
	['bulgarian', 'Bulgarian', 'български език'],
	['czech', 'Czech', 'čeština'],
	['danish', 'Danish', 'Dansk'],
	['dutch', 'Dutch', 'Nederlands'],
	['english', 'English', 'English'],
	['finnish', 'Finnish', 'Suomi'],
	['french', 'French', 'Français'],
	['german', 'German', 'Deutsch'],
	['greek', 'Greek', 'Ελληνικά'],
	['hungarian', 'Hungarian', 'Magyar'],
	['indonesian', 'Indonesian', 'Bahasa Indonesia'],
	['italian', 'Italian', 'Italiano'],
	['japanese', 'Japanese', '日本語'],
	['koreana', 'Korean', '한국어'],
	['latam', 'Spanish (Latin America)', 'Español-Latinoamérica'],
	['malay', 'Malay', 'Bahasa Melayu'],
	['norwegian', 'Norwegian', 'Norsk'],
	['polish', 'Polish', 'Polski'],
	['portuguese', 'Portuguese', 'Português'],
	['romanian', 'Romanian', 'Română'],
	['russian', 'Russian', 'Русский'],
	['schinese', 'Chinese (Simplified)', '简体中文'],
	['spanish', 'Spanish (Spain)', 'Español-España'],
	['swedish', 'Swedish', 'Svenska'],
	['tchinese', 'Chinese (Traditional)', '繁體中文'],
	['thai', 'Thai', 'ไทย'],
	['turkish', 'Turkish', 'Türkçe'],
	['ukrainian', 'Ukrainian', 'Українська'],
	['vietnamese', 'Vietnamese', 'Tiếng Việt'],
];

const VNDB_LANGUAGE_TUPLES: LanguageTuple[] = [
	['ar', 'Arabic', 'العربية'],
	['bg', 'Bulgarian', 'Български'],
	['ca', 'Catalan', 'Català'],
	['ck', 'Cherokee', 'ᏣᎳᎩ'],
	['cs', 'Czech', 'Čeština'],
	['da', 'Danish', 'Dansk'],
	['de', 'German', 'Deutsch'],
	['el', 'Greek', 'Ελληνικά'],
	['en', 'English', 'English'],
	['eo', 'Esperanto', 'Esperanto'],
	['es', 'Spanish', 'Español'],
	['es-mx', 'Spanish (Mexico)', 'Español (México)'],
	['fa', 'Persian', 'فارسی'],
	['fi', 'Finnish', 'Suomi'],
	['fr', 'French', 'Français'],
	['ga', 'Irish', 'Gaeilge'],
	['gd', 'Scottish Gaelic', 'Gàidhlig'],
	['he', 'Hebrew', 'עברית'],
	['hi', 'Hindi', 'हिन्दी'],
	['hr', 'Croatian', 'Hrvatski'],
	['hu', 'Hungarian', 'Magyar'],
	['id', 'Indonesian', 'Bahasa Indonesia'],
	['it', 'Italian', 'Italiano'],
	['iu', 'Inuktitut', 'ᐃᓄᒃᑎᑐᑦ'],
	['ja', 'Japanese', '日本語'],
	['ko', 'Korean', '한국어'],
	['mk', 'Macedonian', 'Македонски'],
	['ms', 'Malay', 'Bahasa Melayu'],
	['nl', 'Dutch', 'Nederlands'],
	['no', 'Norwegian', 'Norsk'],
	['pl', 'Polish', 'Polski'],
	['pt-br', 'Portuguese (Brazil)', 'Português (Brasil)'],
	['pt-pt', 'Portuguese (Portugal)', 'Português (Portugal)'],
	['ro', 'Romanian', 'Română'],
	['ru', 'Russian', 'Русский'],
	['sk', 'Slovak', 'Slovenčina'],
	['sl', 'Slovenian', 'Slovenščina'],
	['sr', 'Serbian', 'Српски'],
	['sv', 'Swedish', 'Svenska'],
	['ta', 'Tamil', 'தமிழ்'],
	['th', 'Thai', 'ไทย'],
	['tr', 'Turkish', 'Türkçe'],
	['uk', 'Ukrainian', 'Українська'],
	['ur', 'Urdu', 'اردو'],
	['vi', 'Vietnamese', 'Tiếng Việt'],
	['zh', 'Chinese', '中文'],
	['zh-Hans', 'Chinese (Simplified)', '简体中文'],
	['zh-Hant', 'Chinese (Traditional)', '繁體中文'],
];

const ISO_639_1_TO_639_2B: Record<string, string> = {
	aa: 'aar',
	ab: 'abk',
	ae: 'ave',
	af: 'afr',
	ak: 'aka',
	am: 'amh',
	an: 'arg',
	ar: 'ara',
	as: 'asm',
	av: 'ava',
	ay: 'aym',
	az: 'aze',
	ba: 'bak',
	be: 'bel',
	bg: 'bul',
	bi: 'bis',
	bm: 'bam',
	bn: 'ben',
	bo: 'tib',
	br: 'bre',
	bs: 'bos',
	ca: 'cat',
	ce: 'che',
	ch: 'cha',
	co: 'cos',
	cr: 'cre',
	cs: 'cze',
	cu: 'chu',
	cv: 'chv',
	cy: 'wel',
	da: 'dan',
	de: 'ger',
	dv: 'div',
	dz: 'dzo',
	ee: 'ewe',
	el: 'gre',
	en: 'eng',
	eo: 'epo',
	es: 'spa',
	et: 'est',
	eu: 'baq',
	fa: 'per',
	ff: 'ful',
	fi: 'fin',
	fj: 'fij',
	fo: 'fao',
	fr: 'fre',
	fy: 'fry',
	ga: 'gle',
	gd: 'gla',
	gl: 'glg',
	gn: 'grn',
	gu: 'guj',
	gv: 'glv',
	ha: 'hau',
	he: 'heb',
	hi: 'hin',
	ho: 'hmo',
	hr: 'hrv',
	ht: 'hat',
	hu: 'hun',
	hy: 'arm',
	hz: 'her',
	ia: 'ina',
	id: 'ind',
	ie: 'ile',
	ig: 'ibo',
	ii: 'iii',
	ik: 'ipk',
	io: 'ido',
	is: 'ice',
	it: 'ita',
	iu: 'iku',
	ja: 'jpn',
	jv: 'jav',
	ka: 'geo',
	kg: 'kon',
	ki: 'kik',
	kj: 'kua',
	kk: 'kaz',
	kl: 'kal',
	km: 'khm',
	kn: 'kan',
	ko: 'kor',
	kr: 'kau',
	ks: 'kas',
	ku: 'kur',
	kv: 'kom',
	kw: 'cor',
	ky: 'kir',
	la: 'lat',
	lb: 'ltz',
	lg: 'lug',
	li: 'lim',
	ln: 'lin',
	lo: 'lao',
	lt: 'lit',
	lu: 'lub',
	lv: 'lav',
	mg: 'mlg',
	mh: 'mah',
	mi: 'mao',
	mk: 'mac',
	ml: 'mal',
	mn: 'mon',
	mr: 'mar',
	ms: 'may',
	mt: 'mlt',
	my: 'bur',
	na: 'nau',
	nb: 'nob',
	nd: 'nde',
	ne: 'nep',
	ng: 'ndo',
	nl: 'dut',
	nn: 'nno',
	no: 'nor',
	nr: 'nbl',
	nv: 'nav',
	ny: 'nya',
	oc: 'oci',
	oj: 'oji',
	om: 'orm',
	or: 'ori',
	os: 'oss',
	pa: 'pan',
	pi: 'pli',
	pl: 'pol',
	ps: 'pus',
	pt: 'por',
	qu: 'que',
	rm: 'roh',
	rn: 'run',
	ro: 'rum',
	ru: 'rus',
	rw: 'kin',
	sa: 'san',
	sc: 'srd',
	sd: 'snd',
	se: 'sme',
	sg: 'sag',
	si: 'sin',
	sk: 'slo',
	sl: 'slv',
	sm: 'smo',
	sn: 'sna',
	so: 'som',
	sq: 'alb',
	sr: 'srp',
	ss: 'ssw',
	st: 'sot',
	su: 'sun',
	sv: 'swe',
	sw: 'swa',
	ta: 'tam',
	te: 'tel',
	tg: 'tgk',
	th: 'tha',
	ti: 'tir',
	tk: 'tuk',
	tl: 'tgl',
	tn: 'tsn',
	to: 'ton',
	tr: 'tur',
	ts: 'tso',
	tt: 'tat',
	tw: 'twi',
	ty: 'tah',
	ug: 'uig',
	uk: 'ukr',
	ur: 'urd',
	uz: 'uzb',
	ve: 'ven',
	vi: 'vie',
	vo: 'vol',
	wa: 'wln',
	wo: 'wol',
	xh: 'xho',
	yi: 'yid',
	yo: 'yor',
	za: 'zha',
	zh: 'chi',
	zu: 'zul',
};

const STEAM_FROM_ISO: Record<string, string> = {
	ar: 'arabic',
	bg: 'bulgarian',
	cs: 'czech',
	da: 'danish',
	de: 'german',
	el: 'greek',
	en: 'english',
	'en-au': 'english',
	'en-ca': 'english',
	'en-gb': 'english',
	'en-us': 'english',
	es: 'spanish',
	'es-419': 'latam',
	'es-ar': 'latam',
	'es-es': 'spanish',
	'es-mx': 'latam',
	fi: 'finnish',
	fr: 'french',
	'fr-ca': 'french',
	'fr-fr': 'french',
	hu: 'hungarian',
	id: 'indonesian',
	it: 'italian',
	ja: 'japanese',
	'ja-jp': 'japanese',
	ko: 'koreana',
	'ko-kr': 'koreana',
	ms: 'malay',
	nb: 'norwegian',
	nl: 'dutch',
	nn: 'norwegian',
	no: 'norwegian',
	pl: 'polish',
	pt: 'portuguese',
	'pt-br': 'brazilian',
	'pt-pt': 'portuguese',
	ro: 'romanian',
	ru: 'russian',
	sv: 'swedish',
	th: 'thai',
	tr: 'turkish',
	uk: 'ukrainian',
	vi: 'vietnamese',
	zh: 'schinese',
	'zh-cn': 'schinese',
	'zh-hk': 'tchinese',
	'zh-tw': 'tchinese',
};

const VNDB_FROM_ISO: Record<string, string> = {
	'es-mx': 'es-mx',
	nb: 'no',
	nn: 'no',
	'pt-br': 'pt-br',
	'pt-pt': 'pt-pt',
	zh: 'zh',
	'zh-cn': 'zh-Hans',
	'zh-hk': 'zh-Hant',
	'zh-tw': 'zh-Hant',
};

const TMDB_FROM_ISO: Record<string, string> = {
	'es-419': 'es-MX',
	nb: 'nb-NO',
	nn: 'nn-NO',
	no: 'nb-NO',
	zh: 'zh-CN',
};

const WIKIPEDIA_FROM_ISO: Record<string, string> = {
	'es-419': 'es',
	'es-ar': 'es',
	'es-es': 'es',
	'es-mx': 'es',
	'fr-ca': 'fr',
	'fr-fr': 'fr',
	nb: 'no',
	'pt-br': 'pt',
	'pt-pt': 'pt',
	'zh-cn': 'zh',
	'zh-hk': 'zh',
	'zh-tw': 'zh',
};

export const METADATA_LANGUAGES: LanguageOption[] = [...fromTuples(ISO_LANGUAGES), ...fromTuples(REGIONAL_LANGUAGES)].sort(compareLanguages);

export const TMDB_LANGUAGES: LanguageOption[] = METADATA_LANGUAGES;

export const WIKIPEDIA_LANGUAGES: LanguageOption[] = [...fromTuples(ISO_LANGUAGES), ...fromTuples(WIKIPEDIA_EXTRA)].sort(compareLanguages);

export const STEAM_LANGUAGES: LanguageOption[] = fromTuples(STEAM_LANGUAGE_TUPLES).sort(compareLanguages);

export const VNDB_LANGUAGES: LanguageOption[] = fromTuples(VNDB_LANGUAGE_TUPLES).sort(compareLanguages);

export const OPEN_LIBRARY_LANGUAGES: LanguageOption[] = fromTuples(ISO_LANGUAGES)
	.map(option => {
		const code = ISO_639_1_TO_639_2B[option.id];
		if (!code) {
			return undefined;
		}
		return lang(code, option.name, option.nativeName);
	})
	.filter((option): option is LanguageOption => option !== undefined)
	.sort(compareLanguages);

export const MAL_TITLE_OPTIONS: LanguageOption[] = [
	lang('default', 'Default'),
	lang('english', 'English'),
	lang('japanese', 'Japanese'),
];

export const INHERIT_LANGUAGE_OPTION: LanguageOption = lang(INHERIT_LANGUAGE, 'Use global');

export function formatLanguageLabel(option: LanguageOption): string {
	return option.name;
}

export function findLanguage(languages: LanguageOption[], id: string): LanguageOption | undefined {
	const lower = id.toLowerCase();
	return languages.find(option => option.id.toLowerCase() === lower);
}

export function parseLanguageInput(value: string, languages: LanguageOption[]): string | undefined {
	const trimmed = value.trim();
	if (!trimmed) {
		return undefined;
	}
	const exact = findLanguage(languages, trimmed);
	if (exact) {
		return exact.id;
	}
	return languages.find(option => formatLanguageLabel(option) === trimmed)?.id;
}

export function languagePrimary(code: string): string {
	const normalized = code.trim();
	const separator = normalized.indexOf('-');
	return separator === -1 ? normalized.toLowerCase() : normalized.slice(0, separator).toLowerCase();
}

function lookupMappedCode(code: string, table: Record<string, string>): string | undefined {
	return table[code.toLowerCase()] ?? table[languagePrimary(code)];
}

function pickExisting(code: string, languages: LanguageOption[], fallback: string): string {
	return findLanguage(languages, code)?.id ?? findLanguage(languages, languagePrimary(code))?.id ?? fallback;
}

export function mapToTmdbLanguage(globalCode: string): string {
	const mapped = lookupMappedCode(globalCode, TMDB_FROM_ISO);
	if (mapped) {
		return mapped;
	}
	return pickExisting(globalCode, TMDB_LANGUAGES, 'en-US');
}

export function mapToWikipediaLanguage(globalCode: string): string {
	const mapped = lookupMappedCode(globalCode, WIKIPEDIA_FROM_ISO);
	if (mapped) {
		return mapped;
	}
	return pickExisting(globalCode, WIKIPEDIA_LANGUAGES, 'en');
}

export function mapToSteamLanguage(globalCode: string): string {
	return lookupMappedCode(globalCode, STEAM_FROM_ISO) ?? 'english';
}

export function mapToVndbLanguage(globalCode: string): string {
	const mapped = lookupMappedCode(globalCode, VNDB_FROM_ISO);
	if (mapped) {
		return mapped;
	}
	return pickExisting(globalCode, VNDB_LANGUAGES, 'en');
}

export function mapToOpenLibraryLanguage(globalCode: string): string {
	const mapped6392 = ISO_639_1_TO_639_2B[languagePrimary(globalCode)];
	if (mapped6392) {
		return mapped6392;
	}
	return pickExisting(globalCode, OPEN_LIBRARY_LANGUAGES, 'eng');
}

function resolveOverride(override: string, fallback: string, mapper: (globalCode: string) => string): string {
	if (!override || override === INHERIT_LANGUAGE) {
		return mapper(fallback);
	}
	return override;
}

export function resolveTmdbLanguage(settings: ApiLanguageSettings): string {
	return resolveOverride(settings.tmdbLanguage, settings.metadataLanguage, mapToTmdbLanguage);
}

export function resolveWikipediaLanguage(settings: ApiLanguageSettings): string {
	const code = resolveOverride(settings.wikipediaLanguage, settings.metadataLanguage, mapToWikipediaLanguage);
	return isSafeWikiLanguage(code) ? code : 'en';
}

export function resolveSteamLanguage(settings: ApiLanguageSettings): string {
	return resolveOverride(settings.steamLanguage, settings.metadataLanguage, mapToSteamLanguage);
}

export function resolveVndbLanguage(settings: ApiLanguageSettings): string {
	return resolveOverride(settings.vndbLanguage, settings.metadataLanguage, mapToVndbLanguage);
}

export function resolveOpenLibraryLanguage(settings: ApiLanguageSettings): string {
	return resolveOverride(settings.openLibraryLanguage, settings.metadataLanguage, mapToOpenLibraryLanguage);
}

export function isEnglishLanguage(code: string): boolean {
	return languagePrimary(code) === 'en' || code === 'eng' || code === 'english';
}

export function isSafeWikiLanguage(code: string): boolean {
	return /^[a-z]{2,12}(?:-[a-z0-9]+)*$/i.test(code);
}

export function withOpenLibraryLanguageFilter(query: string, languageCode: string): string {
	if (!languageCode || isEnglishLanguage(languageCode)) {
		return query;
	}
	return `${query} language:${languageCode}`;
}

export function resolveMalTitlePreference(settings: ApiLanguageSettings): MalTitlePreference {
	const override = settings.malTitleLanguage;
	if (override === 'english' || override === 'japanese' || override === 'default') {
		return override;
	}
	const primary = languagePrimary(settings.metadataLanguage);
	if (primary === 'ja') {
		return 'japanese';
	}
	if (primary === 'en') {
		return 'english';
	}
	return 'default';
}

export function pickMalTitle(preference: MalTitlePreference, titles: { defaultTitle?: string | null; english?: string | null; japanese?: string | null }): string {
	const fallback = titles.defaultTitle ?? titles.english ?? titles.japanese ?? '';
	if (preference === 'english') {
		return titles.english ?? fallback;
	}
	if (preference === 'japanese') {
		return titles.japanese ?? fallback;
	}
	return titles.defaultTitle ?? fallback;
}

export function pickVndbTitle(titles: { title: string; lang: string }[] | undefined, vndbLang: string, officialTitle: string): string {
	if (!titles || titles.length === 0) {
		return officialTitle;
	}
	const exact = titles.find(entry => entry.lang === vndbLang);
	if (exact) {
		return exact.title;
	}
	const primary = languagePrimary(vndbLang);
	const loose = titles.find(entry => languagePrimary(entry.lang) === primary);
	return loose?.title ?? officialTitle;
}
