"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = exports.reseed = void 0;
const test_1 = require("@playwright/test");
const reseed = async (request) => {
    const response = await request.get('http://localhost:9999/testingOnly/reseed');
    (0, test_1.expect)(response.status()).toBe(200);
    return response;
};
exports.reseed = reseed;
const query = async (request, command) => {
    const response = await request.post('http://localhost:9999/testingOnly/query', {
        data: {
            command,
        },
    });
    (0, test_1.expect)(response.status()).toBe(200);
    return response;
};
exports.query = query;
