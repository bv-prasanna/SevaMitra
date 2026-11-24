import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldClearStoredSessionOnRefreshError as clear} from '../src/session-policy.ts';

test('invalid refresh credentials require reauthentication',()=>{
 for(const status of [400,401,403])assert.equal(clear({status}),true);
});
test('offline, rate limit, maintenance and gateway timeouts preserve saved login',()=>{
 for(const status of [0,408,429,500,502,503,504])assert.equal(clear({status}),false);
 for(const error of [new TypeError('Failed to fetch'),null,undefined,{},'network'])assert.equal(clear(error),false);
});
