// Stub for postgres - this package should only be used on the server
// This file is used as an alias during client builds
export default function postgres() {
  throw new Error('postgres cannot be used in the browser. This should only run on the server.');
}



