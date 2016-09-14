'use strict';

const shieldsIo = require('./util/shieldsIo');

function scrutinizer(gitInfo, options) {
    return shieldsIo.fetch(gitInfo, 'scrutinizer', options);
}

module.exports = scrutinizer;
