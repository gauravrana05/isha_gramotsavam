// Mock IndexedDB for offline testing
require('fake-indexeddb/auto');

// Mock structuredClone for Node.js environment
global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock window events
global.window.addEventListener = jest.fn();
global.window.removeEventListener = jest.fn();
global.window.dispatchEvent = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;
