#!/usr/bin/env node
/**
 * Unit tests for the contract-mirror guard. Run with
 * `pnpm test:scripts` (node --test).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    extractGeneratedComponentNames,
    findMirrors,
} from './check-contract-mirrors.mjs';

const TYPES = `
export interface components {
    schemas: {
        CreatePartyDto: {
            name: string;
        };
        UpdatePartyDto: {
            name?: string;
        };
        PartyResponseDto: {
            id: string;
        };
        InvoicePaidStatus: "UNPAID" | "PARTIAL" | "PAID";
    };
    responses: never;
}
`;

const components = extractGeneratedComponentNames(TYPES);

test('extracts object and enum component names only', () => {
    assert.deepEqual(
        [...components].sort(),
        ['CreatePartyDto', 'InvoicePaidStatus', 'PartyResponseDto', 'UpdatePartyDto'],
    );
});

test('flags an exported interface that mirrors a generated component', () => {
    const source = `export interface CreatePartyDto {\n    name: string;\n}\n`;
    const violations = findMirrors(source, components);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].name, 'CreatePartyDto');
    assert.equal(violations[0].kind, 'interface');
    assert.equal(violations[0].line, 1);
});

test('flags a literal type alias that mirrors a generated component', () => {
    const source = `export type UpdatePartyDto = {\n    name?: string;\n}\n`;
    const violations = findMirrors(source, components);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].kind, 'type');
});

test('allows a type alias that re-exports the generated component', () => {
    const source = `export type CreatePartyDto = components["schemas"]["CreatePartyDto"]\n`;
    assert.deepEqual(findMirrors(source, components), []);
});

test('allows a type alias that re-exports a differently named generated component', () => {
    const source = `export type UpsertFinancialSettingDto = components['schemas']['PartyResponseDto']\n`;
    assert.deepEqual(findMirrors(source, components), []);
});

test('flags a hand-written union that mirrors a generated enum', () => {
    const source = `export type InvoicePaidStatus = 'UNPAID' | 'PARTIAL' | 'PAID'`;
    const violations = findMirrors(source, components);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].name, 'InvoicePaidStatus');
});

test('ignores non-generated names, bare re-exports and other declarations', () => {
    const source = [
        `export interface TokenPayload { sub: string }`,
        `export type { PartyResponseDto }`,
        `export type PartyType = 'CUSTOMER' | 'SUPPLIER'`,
        `export const helper = 1`,
    ].join('\n');
    assert.deepEqual(findMirrors(source, components), []);
});

test('reports every mirror in a file with its line number', () => {
    const source = [
        `export interface CreatePartyDto { name: string }`,
        ``,
        `export type UpdatePartyDto = {`,
        `    name?: string`,
        `}`,
        `export interface PartyResponseDto { id: string }`,
    ].join('\n');
    const violations = findMirrors(source, components);
    assert.deepEqual(
        violations.map((v) => [v.line, v.name]),
        [
            [1, 'CreatePartyDto'],
            [3, 'UpdatePartyDto'],
            [6, 'PartyResponseDto'],
        ],
    );
});
