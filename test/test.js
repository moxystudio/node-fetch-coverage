'use strict';

const expect = require('chai').expect;
const nock = require('nock');
const fetchCoverage = require('../');

afterEach(() => {
    nock.enableNetConnect();
    nock.cleanAll();
});

it('should return null if repository is not supported or if the URL is malformed', () => {
    nock.disableNetConnect();

    return Promise.resolve()
    .then(() => {
        return fetchCoverage('git@foo.com:user/project.git')
        .then((coverage) => expect(coverage).to.equal(null));
    })
    .then(() => {
        return fetchCoverage('git://github.com/balderdashy/waterline-%s.git')
        .then((coverage) => expect(coverage).to.equal(null));
    });
});

it('should try appropriate services for GitHub repositories', () => {
    nock('https://img.shields.io')
    .get('/coveralls/IndigoUnited/node-planify.json')
    .reply(200, { name: 'coverage', value: '88%' })
    .get('/codeclimate/coverage/github/IndigoUnited/node-planify.json')
    .reply(200, { name: 'coverage', value: '89%' });

    return fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['coveralls', 'codeclimate'] })
    .then((coverage) => {
        expect(nock.isDone()).to.equal(true);
        expect(coverage).to.equal(0.88);
    });
});

it('should try appropriate services for Bitbucket repositories', () => {
    nock('https://img.shields.io')
    .get('/codeclimate/coverage/bitbucket/IndigoUnited/node-planify.json')
    .reply(200, { name: 'coverage', value: '88%' })
    .get('/scrutinizer/coverage/b/IndigoUnited/node-planify.json')
    .reply(200, { name: 'coverage', value: '89%' });

    return fetchCoverage('git@bitbucket.org:IndigoUnited/node-planify.git', { services: ['coveralls', 'codeclimate', 'scrutinizer'] })
    .then((coverage) => {
        expect(nock.isDone()).to.equal(true);
        expect(coverage).to.equal(0.88);
    });
});

it('should try appropriate services for GitLab repositories', () => {
    nock('https://img.shields.io')
    .get('/codeclimate/coverage/gitlab/IndigoUnited/node-planify.json')
    .reply(200, { name: 'coverage', value: '89%' });

    return fetchCoverage('git@gitlab.com:IndigoUnited/node-planify.git', { services: ['coveralls', 'codeclimate', 'scrutinizer'] })
    .then((coverage) => {
        expect(nock.isDone()).to.equal(true);
        expect(coverage).to.equal(0.89);
    });
});

it('should ignore service errors if at least one succeed', () => {
    nock('https://img.shields.io')
    .get('/coveralls/IndigoUnited/node-planify.json')
    .reply(500)
    .get('/codeclimate/coverage/github/IndigoUnited/node-planify.json')
    .reply(200, { name: 'coverage', value: '89%' });

    return fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['coveralls', 'codeclimate'] })
    .then((coverage) => {
        expect(nock.isDone()).to.equal(true);
        expect(coverage).to.equal(0.89);
    });
});

it('should return null if no coverage is present in all services', () => {
    nock('https://img.shields.io')
    .get('/coveralls/IndigoUnited/node-planify.json')
    .reply(200, { name: 'coverage', value: 'unknown' })
    .get('/codeclimate/coverage/github/IndigoUnited/node-planify.json')
    .reply(200, { name: 'coverage', value: 'invalid' });

    return fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['coveralls', 'codeclimate'] })
    .then((coverage) => {
        expect(nock.isDone()).to.equal(true);
        expect(coverage).to.equal(null);
    });
});

it('should fail if all services fail', () => {
    nock('https://img.shields.io')
    .get('/coveralls/IndigoUnited/node-planify.json')
    .reply(500)
    .get('/codeclimate/coverage/github/IndigoUnited/node-planify.json')
    .reply(500);

    return fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['coveralls', 'codeclimate'] })
    .then(() => {
        throw new Error('Should have failed');
    }, (err) => {
        expect(err.message).to.equal('2 error(s) occurred while trying to fetch coverage');
        expect(err.errors).to.have.length(2);
    });
});

it('should try out options.badges first', () => {
    nock('https://img.shields.io')
    .get('/coveralls/sindresorhus/got/master.json')
    .reply(200, { name: 'coverage', value: '99%' });

    const badges = [{
        info: { service: 'coveralls', type: 'coverage', modifiers: { branch: 'master' } },
        urls: {
            original: 'https://coveralls.io/repos/sindresorhus/got/badge.svg?branch=master',
            service: 'https://coveralls.io/repos/sindresorhus/got/badge.svg?branch=master',
            shields: 'https://img.shields.io/coveralls/sindresorhus/got/master.svg',
            content: 'https://img.shields.io/coveralls/sindresorhus/got/master.json',
        },
    }];

    return fetchCoverage('git@github.com:sindresorhus/got.git', { badges })
    .then((coverage) => {
        expect(nock.isDone()).to.equal(true);
        expect(coverage).to.equal(0.99);
    });
});

it('should use the specified options.branch', () => {
    nock('https://img.shields.io')
    .get('/coveralls/IndigoUnited/node-planify/some-branch.json')
    .reply(200, { name: 'coverage', value: '88%' })
    .get('/codeclimate/coverage/github/IndigoUnited/node-planify.json')  // No branch support
    .reply(200, { name: 'coverage', value: '89%' })
    .get('/scrutinizer/coverage/g/IndigoUnited/node-planify/some-branch.json')
    .reply(200, { name: 'coverage', value: '89%' });

    return fetchCoverage('git@github.com:IndigoUnited/node-planify.git', {
        branch: 'some-branch',
        services: ['coveralls', 'codeclimate', 'scrutinizer'],
    })
    .then((coverage) => {
        expect(nock.isDone()).to.equal(true);
        expect(coverage).to.equal(0.88);
    });
});

it('should not crash when passing an unknown service', () => {
    return fetchCoverage('git@gitlab.com:IndigoUnited/node-planify.git', { services: ['someservice'] })
    .then((coverage) => expect(coverage).to.equal(null));
});

describe('services', () => {
    describe('coveralls', () => {
        it('should fetch coverage for a GitHub repository', () => {
            nock('https://img.shields.io')
            .get('/coveralls/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            return fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['coveralls'] })
            .then((coverage) => {
                expect(nock.isDone()).to.equal(true);
                expect(coverage).to.equal(0.88);
            });
        });

        it('should fetch coverage for a GitHub repository (branch)', () => {
            nock('https://img.shields.io')
            .get('/coveralls/IndigoUnited/node-planify/some-branch.json')
            .reply(200, { name: 'coverage', value: '88%' });

            return fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['coveralls'], branch: 'some-branch' })
            .then((coverage) => {
                expect(nock.isDone()).to.equal(true);
                expect(coverage).to.equal(0.88);
            });
        });
    });

    describe('codeclimate', () => {
        it('should fetch coverage for a GitHub repository', () => {
            nock('https://img.shields.io')
            .get('/codeclimate/coverage/github/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            return fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['codeclimate'] })
            .then((coverage) => {
                expect(nock.isDone()).to.equal(true);
                expect(coverage).to.equal(0.88);
            });
        });

        it('should fetch coverage for a Bitbucket repository', () => {
            nock('https://img.shields.io')
            .get('/codeclimate/coverage/bitbucket/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            return fetchCoverage('git@bitbucket.org:IndigoUnited/node-planify.git', { services: ['codeclimate'] })
            .then((coverage) => {
                expect(nock.isDone()).to.equal(true);
                expect(coverage).to.equal(0.88);
            });
        });

        it('should fetch coverage for a GitLab repository', () => {
            nock('https://img.shields.io')
            .get('/codeclimate/coverage/gitlab/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            return fetchCoverage('git@gitlab.com:IndigoUnited/node-planify.git', { services: ['codeclimate'] })
            .then((coverage) => {
                expect(nock.isDone()).to.equal(true);
                expect(coverage).to.equal(0.88);
            });
        });

        it('should not support branches', () => {
            nock('https://img.shields.io')
            .get('/codeclimate/coverage/bitbucket/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            return fetchCoverage('git@bitbucket.org:IndigoUnited/node-planify.git', { services: ['codeclimate'], branch: 'some-branch' })
            .then((coverage) => {
                expect(nock.isDone()).to.equal(true);
                expect(coverage).to.equal(0.88);
            });
        });
    });

    describe('scrutinizer', () => {
        it('should fetch coverage for a GitHub repository', () => {
            nock('https://img.shields.io')
            .get('/scrutinizer/coverage/g/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            return fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['scrutinizer'] })
            .then((coverage) => {
                expect(nock.isDone()).to.equal(true);
                expect(coverage).to.equal(0.88);
            });
        });

        it('should fetch coverage for a GitHub repository (branch)', () => {
            nock('https://img.shields.io')
            .get('/scrutinizer/coverage/g/IndigoUnited/node-planify/some-branch.json')
            .reply(200, { name: 'coverage', value: '88%' });

            return fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['scrutinizer'], branch: 'some-branch' })
            .then((coverage) => {
                expect(nock.isDone()).to.equal(true);
                expect(coverage).to.equal(0.88);
            });
        });

        it('should fetch coverage for a Bitbucket repository', () => {
            nock('https://img.shields.io')
            .get('/scrutinizer/coverage/b/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            return fetchCoverage('git@bitbucket.org:IndigoUnited/node-planify.git', { services: ['scrutinizer'] })
            .then((coverage) => {
                expect(nock.isDone()).to.equal(true);
                expect(coverage).to.equal(0.88);
            });
        });

        it('should fetch coverage for a Bitbucket repository (branch)', () => {
            nock('https://img.shields.io')
            .get('/scrutinizer/coverage/b/IndigoUnited/node-planify/some-branch.json')
            .reply(200, { name: 'coverage', value: '88%' });

            return fetchCoverage('git@bitbucket.org:IndigoUnited/node-planify.git', { services: ['scrutinizer'], branch: 'some-branch' })
            .then((coverage) => {
                expect(nock.isDone()).to.equal(true);
                expect(coverage).to.equal(0.88);
            });
        });
    });

    describe('codecov', () => {
        it('should fetch coverage for a GitHub repository', () => {
            nock('https://img.shields.io')
            .get('/codecov/c/github/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            return fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['codecov'] })
            .then((coverage) => {
                expect(nock.isDone()).to.equal(true);
                expect(coverage).to.equal(0.88);
            });
        });

        it('should fetch coverage for a GitHub repository (branch)', () => {
            nock('https://img.shields.io')
            .get('/codecov/c/github/IndigoUnited/node-planify/some-branch.json')
            .reply(200, { name: 'coverage', value: '88%' });

            return fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['codecov'], branch: 'some-branch' })
            .then((coverage) => {
                expect(nock.isDone()).to.equal(true);
                expect(coverage).to.equal(0.88);
            });
        });

        it('should fetch coverage for a Bitbucket repository', () => {
            nock('https://img.shields.io')
            .get('/codecov/c/bitbucket/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            return fetchCoverage('git@bitbucket.org:IndigoUnited/node-planify.git', { services: ['codecov'] })
            .then((coverage) => {
                expect(nock.isDone()).to.equal(true);
                expect(coverage).to.equal(0.88);
            });
        });

        it('should fetch coverage for a Bitbucket repository (branch)', () => {
            nock('https://img.shields.io')
            .get('/codecov/c/bitbucket/IndigoUnited/node-planify/some-branch.json')
            .reply(200, { name: 'coverage', value: '88%' });

            return fetchCoverage('git@bitbucket.org:IndigoUnited/node-planify.git', { services: ['codecov'], branch: 'some-branch' })
            .then((coverage) => {
                expect(nock.isDone()).to.equal(true);
                expect(coverage).to.equal(0.88);
            });
        });

        it('should fetch coverage for a GitLab repository', () => {
            nock('https://img.shields.io')
            .get('/codecov/c/gitlab/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            return fetchCoverage('git@gitlab.com:IndigoUnited/node-planify.git', { services: ['codecov'] })
            .then((coverage) => {
                expect(nock.isDone()).to.equal(true);
                expect(coverage).to.equal(0.88);
            });
        });

        it('should fetch coverage for a GitLab repository (branch)', () => {
            nock('https://img.shields.io')
            .get('/codecov/c/gitlab/IndigoUnited/node-planify/some-branch.json')
            .reply(200, { name: 'coverage', value: '88%' });

            return fetchCoverage('git@gitlab.com:IndigoUnited/node-planify.git', { services: ['codecov'], branch: 'some-branch' })
            .then((coverage) => {
                expect(nock.isDone()).to.equal(true);
                expect(coverage).to.equal(0.88);
            });
        });
    });
});
