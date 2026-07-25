/* eslint-env jest */

const fs = require('fs');
const babel = require('@babel/core');

const source = fs.readFileSync(
    require.resolve('scratch-paint/src/reducers/selection-mode'),
    'utf8'
);
const transformed = babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    presets: [[require.resolve('@babel/preset-env'), {modules: 'commonjs'}]]
});
const scratchPaintModule = {exports: {}};
new Function('module', 'exports', transformed.code)( // eslint-disable-line no-new-func
    scratchPaintModule,
    scratchPaintModule.exports
);

const {
    changeBitmapLassoEnabled,
    changeVectorLassoEnabled,
    default: reducer,
    initialState
} = scratchPaintModule.exports;

describe('scratch-paint selection mode', () => {
    test('starts with both lasso modes disabled', () => {
        expect(reducer(void 0, {})).toEqual(initialState);
        expect(initialState).toEqual({
            bitmapLassoEnabled: false,
            vectorLassoEnabled: false
        });
    });

    test('toggles vector lasso independently', () => {
        const state = reducer(initialState, changeVectorLassoEnabled(true));
        expect(state).toEqual({
            bitmapLassoEnabled: false,
            vectorLassoEnabled: true
        });
    });

    test('toggles bitmap lasso independently', () => {
        const state = reducer(initialState, changeBitmapLassoEnabled(true));
        expect(state).toEqual({
            bitmapLassoEnabled: true,
            vectorLassoEnabled: false
        });
    });
});
