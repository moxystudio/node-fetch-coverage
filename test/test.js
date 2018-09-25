'use strict';

const nock = require('nock');
const fetchCoverage = require('../');

afterEach(() => {
    nock.enableNetConnect();
    nock.cleanAll();
});

it('should return null if repository is not supported or if the URL is malformed', async () => {
    nock.disableNetConnect();

    let promise = fetchCoverage('git@foo.com:user/project.git');
    let coverage = await promise;

    expect(promise instanceof Promise).toBe(true);
    expect(coverage).toBe(null);

    promise = fetchCoverage('git://github.com/balderdashy/waterline-%s.git');
    coverage = await promise;

    expect(promise instanceof Promise).toBe(true);
    expect(coverage).toBe(null);
});

it('should try appropriate services for GitHub repositories', async () => {
    nock('https://img.shields.io')
    .get('/coveralls/IndigoUnited/node-planify.json')
    .reply(200, { name: 'coverage', value: '88%' })
    .get('/codeclimate/coverage/github/IndigoUnited/node-planify.json')
    .reply(200, { name: 'coverage', value: '89%' });

    const coverage = await fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['coveralls', 'codeclimate'] });

    expect(nock.isDone()).toBe(true);
    expect(coverage).toBe(0.88);
});

it('should try appropriate services for Bitbucket repositories', async () => {
    nock('https://img.shields.io')
    .get('/codeclimate/coverage/bitbucket/IndigoUnited/node-planify.json')
    .reply(200, { name: 'coverage', value: '88%' })
    .get('/scrutinizer/coverage/b/IndigoUnited/node-planify.json')
    .reply(200, { name: 'coverage', value: '89%' });

    const coverage = await fetchCoverage('git@bitbucket.org:IndigoUnited/node-planify.git',
        { services: ['coveralls', 'codeclimate', 'scrutinizer'] });

    expect(nock.isDone()).toBe(true);
    expect(coverage).toBe(0.88);
});

it('should try appropriate services for GitLab repositories', async () => {
    nock('https://img.shields.io')
    .get('/codeclimate/coverage/gitlab/IndigoUnited/node-planify.json')
    .reply(200, { name: 'coverage', value: '89%' });

    const coverage = await fetchCoverage('git@gitlab.com:IndigoUnited/node-planify.git',
        { services: ['coveralls', 'codeclimate', 'scrutinizer'] });

    expect(nock.isDone()).toBe(true);
    expect(coverage).toBe(0.89);
});

it('should ignore service errors if at least one succeed', async () => {
    nock('https://img.shields.io')
    .get('/coveralls/IndigoUnited/node-planify.json')
    .reply(500)
    .get('/codeclimate/coverage/github/IndigoUnited/node-planify.json')
    .reply(200, { name: 'coverage', value: '89%' });

    const coverage = await fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['coveralls', 'codeclimate'] });

    expect(nock.isDone()).toBe(true);
    expect(coverage).toBe(0.89);
});

it('should return null if no coverage is present in all services', async () => {
    nock('https://img.shields.io')
    .get('/coveralls/IndigoUnited/node-planify.json')
    .reply(200, { name: 'coverage', value: 'unknown' })
    .get('/codeclimate/coverage/github/IndigoUnited/node-planify.json')
    .reply(200, { name: 'coverage', value: 'invalid' });

    const coverage = await fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['coveralls', 'codeclimate'] });

    expect(nock.isDone()).toBe(true);
    expect(coverage).toBe(null);
});

it('should fail if all services fail', async () => {
    nock('https://img.shields.io')
    .get('/coveralls/IndigoUnited/node-planify.json')
    .reply(500)
    .get('/codeclimate/coverage/github/IndigoUnited/node-planify.json')
    .reply(500);

    expect.assertions(2);

    try {
        await fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['coveralls', 'codeclimate'] });
    } catch (err) {
        expect(err.message).toBe('2 error(s) occurred while trying to fetch coverage');
        expect(err.errors).toHaveLength(2);
    }
});

it('should try out options.badges first', async () => {
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

    const coverage = await fetchCoverage('git@github.com:sindresorhus/got.git', { badges });

    expect(nock.isDone()).toBe(true);
    expect(coverage).toBe(0.99);
});

it('should use the specified options.branch', async () => {
    nock('https://img.shields.io')
    .get('/coveralls/IndigoUnited/node-planify/some-branch.json')
    .reply(200, { name: 'coverage', value: '88%' })
    .get('/codeclimate/coverage/github/IndigoUnited/node-planify.json') // No branch support
    .reply(200, { name: 'coverage', value: '89%' })
    .get('/scrutinizer/coverage/g/IndigoUnited/node-planify/some-branch.json')
    .reply(200, { name: 'coverage', value: '89%' });

    const coverage = await fetchCoverage('git@github.com:IndigoUnited/node-planify.git', {
        branch: 'some-branch',
        services: ['coveralls', 'codeclimate', 'scrutinizer'],
    });

    expect(nock.isDone()).toBe(true);
    expect(coverage).toBe(0.88);
});

it('should not crash when passing an unknown service', async () => {
    const coverage = await fetchCoverage('git@gitlab.com:IndigoUnited/node-planify.git', { services: ['someservice'] });

    expect(coverage).toBe(null);
});

describe('services', () => {
    describe('coveralls', () => {
        it('should fetch coverage for a GitHub repository', async () => {
            nock('https://img.shields.io')
            .get('/coveralls/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            const coverage = await fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['coveralls'] });

            expect(nock.isDone()).toBe(true);
            expect(coverage).toBe(0.88);
        });

        it('should fetch coverage for a GitHub repository (branch)', async () => {
            nock('https://img.shields.io')
            .get('/coveralls/IndigoUnited/node-planify/some-branch.json')
            .reply(200, { name: 'coverage', value: '88%' });

            const coverage = await fetchCoverage('git@github.com:IndigoUnited/node-planify.git',
                { services: ['coveralls'], branch: 'some-branch' });

            expect(nock.isDone()).toBe(true);
            expect(coverage).toBe(0.88);
        });
    });

    describe('codeclimate', () => {
        it('should fetch coverage for a GitHub repository', async () => {
            nock('https://img.shields.io')
            .get('/codeclimate/coverage/github/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            const coverage = await fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['codeclimate'] });

            expect(nock.isDone()).toBe(true);
            expect(coverage).toBe(0.88);
        });

        it('should fetch coverage for a Bitbucket repository', async () => {
            nock('https://img.shields.io')
            .get('/codeclimate/coverage/bitbucket/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            const coverage = await fetchCoverage('git@bitbucket.org:IndigoUnited/node-planify.git', { services: ['codeclimate'] });

            expect(nock.isDone()).toBe(true);
            expect(coverage).toBe(0.88);
        });

        it('should fetch coverage for a GitLab repository', async () => {
            nock('https://img.shields.io')
            .get('/codeclimate/coverage/gitlab/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            const coverage = await fetchCoverage('git@gitlab.com:IndigoUnited/node-planify.git', { services: ['codeclimate'] });

            expect(nock.isDone()).toBe(true);
            expect(coverage).toBe(0.88);
        });

        it('should not support branches', async () => {
            nock('https://img.shields.io')
            .get('/codeclimate/coverage/bitbucket/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            const coverage = await fetchCoverage('git@bitbucket.org:IndigoUnited/node-planify.git',
                { services: ['codeclimate'], branch: 'some-branch' });

            expect(nock.isDone()).toBe(true);
            expect(coverage).toBe(0.88);
        });
    });

    describe('scrutinizer', () => {
        it('should fetch coverage for a GitHub repository', async () => {
            nock('https://img.shields.io')
            .get('/scrutinizer/coverage/g/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            const coverage = await fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['scrutinizer'] });

            expect(nock.isDone()).toBe(true);
            expect(coverage).toBe(0.88);
        });

        it('should fetch coverage for a GitHub repository (branch)', async () => {
            nock('https://img.shields.io')
            .get('/scrutinizer/coverage/g/IndigoUnited/node-planify/some-branch.json')
            .reply(200, { name: 'coverage', value: '88%' });

            const coverage = await fetchCoverage('git@github.com:IndigoUnited/node-planify.git',
                { services: ['scrutinizer'], branch: 'some-branch' });

            expect(nock.isDone()).toBe(true);
            expect(coverage).toBe(0.88);
        });

        it('should fetch coverage for a Bitbucket repository', async () => {
            nock('https://img.shields.io')
            .get('/scrutinizer/coverage/b/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            const coverage = await fetchCoverage('git@bitbucket.org:IndigoUnited/node-planify.git', { services: ['scrutinizer'] });

            expect(nock.isDone()).toBe(true);
            expect(coverage).toBe(0.88);
        });

        it('should fetch coverage for a Bitbucket repository (branch)', async () => {
            nock('https://img.shields.io')
            .get('/scrutinizer/coverage/b/IndigoUnited/node-planify/some-branch.json')
            .reply(200, { name: 'coverage', value: '88%' });

            const coverage = await fetchCoverage('git@bitbucket.org:IndigoUnited/node-planify.git',
                { services: ['scrutinizer'], branch: 'some-branch' });

            expect(nock.isDone()).toBe(true);
            expect(coverage).toBe(0.88);
        });
    });

    describe('codecov', () => {
        it('should fetch coverage for a GitHub repository', async () => {
            nock('https://img.shields.io')
            .get('/codecov/c/github/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            const coverage = await fetchCoverage('git@github.com:IndigoUnited/node-planify.git', { services: ['codecov'] });

            expect(nock.isDone()).toBe(true);
            expect(coverage).toBe(0.88);
        });

        it('should fetch coverage for a GitHub repository (branch)', async () => {
            nock('https://img.shields.io')
            .get('/codecov/c/github/IndigoUnited/node-planify/some-branch.json')
            .reply(200, { name: 'coverage', value: '88%' });

            const coverage = await fetchCoverage('git@github.com:IndigoUnited/node-planify.git',
                { services: ['codecov'], branch: 'some-branch' });

            expect(nock.isDone()).toBe(true);
            expect(coverage).toBe(0.88);
        });

        it('should fetch coverage for a Bitbucket repository', async () => {
            nock('https://img.shields.io')
            .get('/codecov/c/bitbucket/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            const coverage = await fetchCoverage('git@bitbucket.org:IndigoUnited/node-planify.git', { services: ['codecov'] });

            expect(nock.isDone()).toBe(true);
            expect(coverage).toBe(0.88);
        });

        it('should fetch coverage for a Bitbucket repository (branch)', async () => {
            nock('https://img.shields.io')
            .get('/codecov/c/bitbucket/IndigoUnited/node-planify/some-branch.json')
            .reply(200, { name: 'coverage', value: '88%' });

            const coverage = await fetchCoverage('git@bitbucket.org:IndigoUnited/node-planify.git',
                { services: ['codecov'], branch: 'some-branch' });

            expect(nock.isDone()).toBe(true);
            expect(coverage).toBe(0.88);
        });

        it('should fetch coverage for a GitLab repository', async () => {
            nock('https://img.shields.io')
            .get('/codecov/c/gitlab/IndigoUnited/node-planify.json')
            .reply(200, { name: 'coverage', value: '88%' });

            const coverage = await fetchCoverage('git@gitlab.com:IndigoUnited/node-planify.git', { services: ['codecov'] });

            expect(nock.isDone()).toBe(true);
            expect(coverage).toBe(0.88);
        });

        it('should fetch coverage for a GitLab repository (branch)', async () => {
            nock('https://img.shields.io')
            .get('/codecov/c/gitlab/IndigoUnited/node-planify/some-branch.json')
            .reply(200, { name: 'coverage', value: '88%' });

            const coverage = await fetchCoverage('git@gitlab.com:IndigoUnited/node-planify.git',
                { services: ['codecov'], branch: 'some-branch' });

            expect(nock.isDone()).toBe(true);
            expect(coverage).toBe(0.88);
        });
    });
});
