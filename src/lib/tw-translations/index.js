import twTranslations from './generated-translations.json';

const unsandTranslations = {
    ja: {
        'unsand.soundEditor.lowPass': 'ローパス',
        'unsand.soundEditor.highPass': 'ハイパス',
        'unsand.soundEditor.lowPassFadeIn': 'ローパス・フェードイン',
        'unsand.soundEditor.lowPassFadeOut': 'ローパス・フェードアウト',
        'unsand.soundEditor.highPassFadeIn': 'ハイパス・フェードイン',
        'unsand.soundEditor.highPassFadeOut': 'ハイパス・フェードアウト',
        'unsand.soundEditor.modify': '調整',
        'unsand.soundEditor.format': 'フォーマット',
        'unsand.soundEditor.filters': 'フィルター',
        'unsand.soundEditor.apply': '適用',
        'unsand.soundEditor.fadeFilterIn': '徐々に解除',
        'unsand.soundEditor.fadeFilterOut': '徐々に適用',
        'unsand.soundEditor.sampleRate': 'サンプルレート',
        'unsand.soundEditor.modifyTitle': '音声を調整',
        'unsand.soundEditor.pitch': 'ピッチ',
        'unsand.soundEditor.volume': '音量',
        'unsand.soundEditor.sampleRateTitle': 'サンプルレート',
        'unsand.soundEditor.sampleRateInput': 'サンプルレート',
        'unsand.soundEditor.range': '適用範囲',
        'unsand.soundEditor.wholeSound': '音声全体',
        'unsand.soundEditor.selection': '選択範囲のみ',
        'unsand.soundEditor.invalidValue': '範囲内の数値を入力してください。',
        'pm.paint.modeTools.merge': '結合',
        'pm.paint.modeTools.mask': 'マスク',
        'pm.paint.modeTools.subtract': '型抜き',
        'pm.paint.modeTools.filter': 'フィルター',
        'paint.modeTools.movementCenter': '中心',
        'paint.modeTools.cut': '切り取り',
        'paint.penMode.pen': 'ペン',
        'paint.triangleMode.triangle': '三角形',
        'paint.shapeMode.shape': '図形',
        'paint.arrowMode.arrow': '矢印'
    }
};

const addAdditionalTranslations = editorMessages => {
    for (const locale of Object.keys(editorMessages)) {
        const toMixIn = twTranslations[locale.toLowerCase()];
        if (toMixIn) {
            Object.assign(editorMessages[locale], toMixIn);
        }
        const unsandMessages = unsandTranslations[locale.toLowerCase()];
        if (unsandMessages) {
            Object.assign(editorMessages[locale], unsandMessages);
        }
    }

    // We reuse our `es` translations for `es-419` instead of maintaining separate translations.
    Object.assign(editorMessages['es-419'], twTranslations.es);
};

export default addAdditionalTranslations;
