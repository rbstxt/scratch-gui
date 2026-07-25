const TURBEST_PREFERENCES_KEY = 'turbest:preferences';

const SET_PREFERENCE = 'scratch-gui/preferences/SET_PREFERENCE';

const readInitialState = () => {
    try {
        return JSON.parse(localStorage.getItem(TURBEST_PREFERENCES_KEY) || '{}');
    } catch (error) {
        return {};
    }
};

const initialState = readInitialState();

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_PREFERENCE: {
        const newState = Object.assign({}, state, {
            [action.key]: action.value
        });
        localStorage.setItem(TURBEST_PREFERENCES_KEY, JSON.stringify(newState));
        return newState;
    }
    default:
        return state;
    }
};

const setPreference = (key, value) => ({
    type: SET_PREFERENCE,
    key,
    value
});

export {
    reducer as default,
    initialState as preferencesInitialState,
    setPreference
};
