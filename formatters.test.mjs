import test from 'node:test'; import assert from 'node:assert/strict'; import {formatMoney,formatSignedMoney,getWinRate,formatPercent} from '../src/lib/formatters.js';
test('formats USD values consistently',()=>assert.equal(formatMoney(1250.5),'$1,250.50'));
test('formats positive, negative and zero P/L',()=>{assert.equal(formatSignedMoney(12.3),'+$12.30');assert.equal(formatSignedMoney(-12.3),'-$12.30');assert.equal(formatSignedMoney(0),'$0.00')});
test('calculates win rate and handles empty history',()=>{assert.equal(getWinRate(7,3),70);assert.equal(getWinRate(0,0),0)});
test('formats percentages to requested precision',()=>assert.equal(formatPercent(62.345),'62.3%'));