'use strict';

const shieldsIo = require('./util/shieldsIo');

function coveralls(gitInfo, options) {
    return shieldsIo.fetch(gitInfo, 'coveralls', options);
}

module.exports = coveralls;
