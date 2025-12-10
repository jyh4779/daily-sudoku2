/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

// Mocks
jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: () => ({
    initialize: jest.fn(),
  }),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  GoogleSigninButton: {
    Size: { Wide: 'Wide' },
    Color: { Dark: 'Dark' },
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
  },
}));

jest.mock('react-native-sound', () => {
  return class Sound {
    constructor() { }
    setVolume = jest.fn();
    setNumberOfLoops = jest.fn();
    play = jest.fn();
    stop = jest.fn();
    release = jest.fn();
    static setCategory = jest.fn();
  };
});

jest.mock('react-native-fs', () => ({
  writeFile: jest.fn(),
  appendFile: jest.fn(),
  DocumentDirectoryPath: '/test/path',
  exists: jest.fn(() => Promise.resolve(false)),
  mkdir: jest.fn(),
}));

jest.mock('react-native-version-check', () => ({
  needUpdate: jest.fn(() => Promise.resolve({ isNeeded: false })),
  getStoreUrl: jest.fn(),
}));

jest.mock('@react-native-firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
  })),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(null);
    return jest.fn();
  }),
}));

jest.mock('@react-native-firebase/firestore', () => () => ({
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      set: jest.fn(),
      get: jest.fn(() => Promise.resolve({ exists: false })),
    })),
  })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

import App from '../App';


test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
