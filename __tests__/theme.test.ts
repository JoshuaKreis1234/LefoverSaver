import test from 'node:test';
import assert from 'node:assert/strict';
const { money } = require('../money');

test('formats zero amount in USD', () => {
  assert.strictEqual(money(0), '$0.00');
});

test('formats amount in EUR with de-DE locale', () => {
  assert.strictEqual(money(12345, 'EUR', 'de-DE'), '123,45\u00A0€');
});
