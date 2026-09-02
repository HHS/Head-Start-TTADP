import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const repositoryFile = (fileName: string) =>
    fs.readFileSync(path.join(process.cwd(), fileName), 'utf8');

const deploymentValue = (environment: string, key: string) => {
    const contents = repositoryFile(`deployment_config/${environment}_vars.yml`);
    const match = contents.match(new RegExp(`^${key}: (.+)$`, 'm'));

    if (!match) {
        throw new Error(`${key} is not configured for ${environment}`);
    }

    return match[1];
};

describe('Node deployment configuration', () => {
    it('uses the same Node version in runtime, container, and CI declarations', () => {
        const nodeVersion = repositoryFile('.nvmrc').trim();
        const packageJson = JSON.parse(repositoryFile('package.json'));
        const frontendPackageJson = JSON.parse(repositoryFile('frontend/package.json'));

        expect(nodeVersion).toBe('24.19.0');
        expect(packageJson.engines.node).toBe(nodeVersion);
        expect(frontendPackageJson.engines.node).toBe(nodeVersion);
        expect(repositoryFile('Dockerfile')).toContain(`FROM node:${nodeVersion}`);
        expect(repositoryFile('docker/images/Docker.local')).toContain(`FROM node:${nodeVersion}`);
        expect(repositoryFile('.circleci/config.yml')).toContain(`cimg/node:${nodeVersion}-browsers`);
    });

    it.each<[string, number, number, number]>([
        ['dev', 512, 1, 192],
        ['staging', 512, 1, 192],
        ['sandbox', 1024, 2, 256],
        ['prod', 1024, 2, 256],
    ])(
        'keeps %s aggregate worker old-space within 75 percent of its container',
        (environment, memoryMb, concurrency, maxOldSpaceMb) => {
            const expectedMemory = memoryMb === 1024 ? '1GB' : `${memoryMb}M`;

            expect(deploymentValue(environment, 'worker_memory')).toBe(expectedMemory);
            expect(Number(deploymentValue(environment, 'worker_concurrency'))).toBe(concurrency);
            expect(Number(deploymentValue(environment, 'worker_max_old_space_size'))).toBe(
                maxOldSpaceMb
            );

            const nodeProcesses = concurrency + 1;
            expect(nodeProcesses * maxOldSpaceMb).toBeLessThanOrEqual(memoryMb * 0.75);
        }
    );

    it('applies heap and concurrency settings only to the worker process', () => {
        const manifest = repositoryFile('manifest.yml');

        expect(manifest).toContain('command: yarn start:be');
        expect(manifest).toContain(
            'command: WORKER_CONCURRENCY=((worker_concurrency)) node --max-old-space-size=((worker_max_old_space_size)) ./build/server/src/worker.js'
        );
        expect(manifest).not.toContain('NODE_OPTIONS');
    });
});
