'use strict';

const shieldsIo = require('./util/shieldsIo');

function codecov(gitInfo, options) {
    return shieldsIo.fetch(gitInfo, 'codecov', options);
}

module.exports = codecov;
