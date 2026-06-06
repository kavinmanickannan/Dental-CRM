// Placeholder for the future cloud backend integration layer.
//
// Per system_architecture.md §7.5, this module will hold the Supabase client
// and all remote API calls (replacing the IndexedDB/localStorage persistence
// in db.js) once the app migrates to a hosted multi-clinic backend. Nothing
// in the app imports from here yet -- this file exists so the module
// boundary is in place ahead of that migration.
export {};
