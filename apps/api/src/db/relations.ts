// Relations are fully derived from the Drizzle schema itself: every relation
// this codebase needs is expressible as an inline foreign key on the column,
// so `defineRelations(schema)` covers all 165 of them.
//
// There is no per-model aggregation here because the `modules_*Relations`
// `defineRelationsPart` parts were measured to contribute 0 additional
// relations and 0 overrides vs `defineRelations(schema)`.
// If you ever need a relation that is NOT expressible as a column FK
// (custom relation names, self/polymorphic edges), add it here explicitly.
import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const relations = defineRelations(schema);