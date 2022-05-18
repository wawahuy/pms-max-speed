'use strict';
const assert = require('assert');
const buildType = 'Debug';
const bindingPath = require.resolve(`../build/${buildType}/binding`);
const binding = require(bindingPath);

console.log('binding.hello() =', binding.hello());