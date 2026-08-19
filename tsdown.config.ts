import { clientBundle } from '../tsdown.client.ts'

// The package is developed independently, but its browser bundle deliberately
// occupies the established conversation module id so existing client plugins
// keep their dependency edge and service contract unchanged when Web aliases
// that package id to this replacement.
export default clientBundle('@deepseek-ai/dsh-client-ui-conversation', ['lib/types/index.js', 'lib/types/invariant.js'])
