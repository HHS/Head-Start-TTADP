import fakerUnique, { resetFakerUnique } from './fakerUnique';

describe('fakerUnique', () => {
    afterEach(() => {
        resetFakerUnique();
    });

    it('can reset seen values', () => {
        const generator = jest.fn(() => 'same-value');

        expect(fakerUnique(generator)).toBe('same-value');
        expect(() => fakerUnique(generator, 2)).toThrow(
            'fakerUnique: exceeded maximum retries (2) generating a unique value',
        );

        resetFakerUnique();

        expect(fakerUnique(generator, 1)).toBe('same-value');
    });
});
