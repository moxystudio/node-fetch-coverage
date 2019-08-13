'use strict';

const got = require('got');

// Mapping that associates the repository type with the services
const servicesSupportedTypesMap = {
    coveralls: ['github'], // Coveralls actually supports bitbucket but shields.io only supports github, see: https://github.com/badges/shields/issues/793
    codeclimate: ['github', 'bitbucket', 'gitlab'],
    scrutinizer: ['github', 'bitbucket'],
    codecov: ['github', 'bitbucket', 'gitlab'],
};

// Scrutinizer uses alias for the repository types
const scrutinizerTypeToAliasMap = {
    github: 'g',
    bitbucket: 'b',
};

function getUrl(gitInfo, service, options) {
    // Check if the service supports the repository
    const supportedTypes = servicesSupportedTypesMap[service];

    if (!supportedTypes || supportedTypes.indexOf(gitInfo.type) === -1) {
        return null;
    }

    // Generate the URL
    switch (service) {
    case 'coveralls':
        return `https://img.shields.io/coveralls/${gitInfo.user}/${gitInfo.project}${options.branch ? `/${options.branch}` : ''}.json`;
    case 'codeclimate':
        return `https://img.shields.io/codeclimate/coverage/${gitInfo.user}/${gitInfo.project}.json`;
    case 'scrutinizer': {
        return `https://img.shields.io/scrutinizer/coverage/${scrutinizerTypeToAliasMap[gitInfo.type]}/${gitInfo.user}/${gitInfo.project}${options.branch ? `/${options.branch}` : ''}.json`;
    }
    case 'codecov':
        return `https://img.shields.io/codecov/c/${gitInfo.type}/${gitInfo.user}/${gitInfo.project}${options.branch ? `/${options.branch}` : ''}.json`;
    /* istanbul ignore next */
    default:
        return null;
    }
}

// -------------------------------------------

function request(url, options) {
    options = {
        ...options,
        json: true,
    };

    return got(url, options)
    .then((response) => {
        const json = response.body;

        /* istanbul ignore if */
        if (typeof json.value !== 'string') {
            return null;
        }

        const match = json.value.match(/^(\d+)%$/);

        return match ? Number(match[1]) / 100 : null;
    })
    .catch((err) => {
        // Swallow ParseErrors (i.e. invalid json payloads, but valid responses) and return null
        if (err instanceof got.ParseError) {
            return null;
        }

        throw err;
    });
}

function fetch(gitInfo, service, options) {
    const url = getUrl(gitInfo, service, options);

    return url ? request(url, options) : Promise.resolve(null);
}

module.exports.fetch = fetch;
module.exports.request = request;
