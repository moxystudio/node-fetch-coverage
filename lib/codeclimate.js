'use strict';

const shieldsIo = require('./util/shieldsIo');

function codeclimate(gitInfo, options) {
    return shieldsIo.fetch(gitInfo, 'codeclimate', options);
}

module.exports = codeclimate;
