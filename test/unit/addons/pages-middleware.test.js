import {onRequest} from '../../../functions/_middleware';

beforeAll(() => {
    global.Response = {
        redirect: jest.fn((url, status) => ({url, status}))
    };
});

beforeEach(() => {
    Response.redirect.mockClear();
});

test.each([
    ['https://unsand.pages.dev/123/editor?fps=60', 'https://turbest.pages.dev/123/editor?fps=60'],
    ['https://unsand.1zworks.com/123/editor?fps=60', 'https://turbest.1zworks.com/123/editor?fps=60']
])('redirects legacy hosts with path and query intact', (source, destination) => {
    const response = onRequest({request: {url: source}});
    expect(response).toEqual({url: destination, status: 308});
});

test.each([
    'https://abc123.unsand.pages.dev/editor',
    'https://turbest.pages.dev/editor',
    'https://turbest.1zworks.com/editor'
])('serves non-legacy hosts normally', url => {
    const next = jest.fn(() => 'next');
    expect(onRequest({request: {url}, next})).toBe('next');
    expect(next).toHaveBeenCalledTimes(1);
});
