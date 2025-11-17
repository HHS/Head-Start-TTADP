/* eslint-disable no-console */
import { Op } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import db, {
  ActivityReport,
  ActivityReportResource,
  ActivityReportObjective,
  ActivityReportObjectiveResource,
  Goal,
  GoalResource,
  NextStep,
  NextStepResource,
  Resource,
  Objective,
} from '../models';
import {
  // Resource Table
  findOrCreateResource,
  findOrCreateResources,
  // Helper functions
  calculateIsAutoDetected,
  remapAttributes,
  collectURLsFromField,
  resourcesFromField,
  mergeRecordsByUrlAndGenericId,
  transformRecordByURLToResource,
  filterResourcesForSync,
  // ActivityReports Resource Processing
  calculateIsAutoDetectedForActivityReport,
  syncResourcesForActivityReport,
  // processActivityReportForResources,
  processActivityReportForResourcesById,
  // NextSteps Resource Processing
  calculateIsAutoDetectedForNextStep,
  syncResourcesForNextStep,
  // processNextStepForResources,
  processNextStepForResourcesById,
  // Goal Resource processing
  calculateIsAutoDetectedForGoal,
  syncResourcesForGoal,
  // processGoalForResources,
  processGoalForResourcesById,
  // ActivityReportObjective Resource Processing
  calculateIsAutoDetectedForActivityReportObjective,
  syncResourcesForActivityReportObjective,
  // processActivityReportObjectiveForResources,
  processActivityReportObjectiveForResourcesById,
} from './resource';
import {
  SOURCE_FIELD,
  NEXTSTEP_NOTETYPE,
  OBJECTIVE_STATUS,
  GOAL_STATUS,
} from '../constants';

describe('resource', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });
  describe('Resource Table', () => {
    describe('findOrCreateResource', () => {
      const urlGoogle = 'http://google.com';
      let url;

      let existingHeadStartResource;
      let createdECLKCResource;
      let createdECLKCResource2;
      let createdHeadStartResource;

      beforeAll(async () => {
        existingHeadStartResource = await Resource.create({
          url: 'https://headstart.gov/existingsingle',
          domain: 'headstart.gov',
        });
      });

      afterAll(async () => {
        // Delete created ECLKC resource.
        await Resource.destroy({
          where: {
            id: [
              createdECLKCResource ? createdECLKCResource.id : 0,
              createdECLKCResource2 ? createdECLKCResource2.id : 0],
          },
          individualHooks: false,
          force: true,
        });

        // Delete existingHeadStartResource.
        await Resource.destroy({
          where: {
            id: [
              existingHeadStartResource ? existingHeadStartResource.id : 0,
              createdHeadStartResource ? createdHeadStartResource.id : 0],
          },
          individualHooks: false,
          force: true,
        });
      });

      beforeEach(() => {
        url = urlGoogle;
      });

      afterEach(async () => {
        await Resource.destroy({
          where: { url: urlGoogle },
          individualHooks: true,
        });
      });
      it('expected usage, new', async () => {
        const resource = await findOrCreateResource(url);
        expect(resource)
          .toMatchObject({
            domain: 'google.com',
            url,
          });
        expect(typeof resource.id).toBe('number');
      });
      it('expected usage, existing', async () => {
        const resource1 = await findOrCreateResource(url);
        const resource2 = await findOrCreateResource(url);
        expect(resource2).toMatchObject(resource1);
      });
      it('fail to undefined, null url', async () => {
        url = null;
        const resource = await findOrCreateResource(url);
        expect(resource).toBe(undefined);
      });
      it('fail to undefined, undefined url', async () => {
        url = undefined;
        const resource = await findOrCreateResource(url);
        expect(resource).toBe(undefined);
      });
      it('fail to undefined, number url', async () => {
        url = 0;
        const resource = await findOrCreateResource(url);
        expect(resource).toBe(undefined);
      });
      it('fail to undefined, array url', async () => {
        url = [];
        const resource = await findOrCreateResource(url);
        expect(resource).toBe(undefined);
      });
      it('fail to undefined, object url', async () => {
        url = {};
        const resource = await findOrCreateResource(url);
        expect(resource).toBe(undefined);
      });

      it('maps to an existing headstart.gov resource if the url is ECLKC', async () => {
        createdECLKCResource = await findOrCreateResource('https://eclkc.ohs.acf.hhs.gov/existingsingle');
        expect(createdECLKCResource).not.toBeNull();
        // Verify eclkc with and existing headstart.gov
        expect(createdECLKCResource.url).toBe('https://eclkc.ohs.acf.hhs.gov/existingsingle');
        expect(createdECLKCResource.mapsTo).toBe(existingHeadStartResource.id);
      });

      it('maps to an non existing headstart.gov resource if the url is ECLKC', async () => {
        createdECLKCResource2 = await findOrCreateResource('https://eclkc.ohs.acf.hhs.gov/notexistingsingle');
        expect(createdECLKCResource2).not.toBeNull();

        // Find the headstart url we auto created.
        createdHeadStartResource = await Resource.findOne({
          where: { url: 'https://headstart.gov/notexistingsingle' },
        });
        expect(createdHeadStartResource).not.toBeNull();
        expect(createdHeadStartResource.domain).toBe('headstart.gov');

        // Verify eclkc with the auto created headstart url.
        expect(createdECLKCResource2.url).toBe('https://eclkc.ohs.acf.hhs.gov/notexistingsingle');
        expect(createdECLKCResource2.mapsTo).toBe(createdHeadStartResource.id);
      });
    });
    describe('findOrCreateResources', () => {
      const urlsTest = [
        'http://google.com',
        'http://github.com',
        'http://github.com',
      ];
      let urls;
      const sorter = (a, b) => {
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
      };

      let existingHeadStartResource;
      let createdECLKCResource;
      let createdECLKCResource2;
      let createdHeadStartResource;

      beforeAll(async () => {
        existingHeadStartResource = await Resource.create({
          url: 'https://headstart.gov/existing',
          domain: 'headstart.gov',
        });
      });

      afterAll(async () => {
        // Delete created ECLKC resource.
        await Resource.destroy({
          where: {
            id: [
              createdECLKCResource ? createdECLKCResource.id : 0,
              createdECLKCResource2 ? createdECLKCResource2.id : 0],
          },
          individualHooks: false,
          force: true,
        });

        // Delete existingHeadStartResource.
        await Resource.destroy({
          where: {
            id: [
              existingHeadStartResource ? existingHeadStartResource.id : 0,
              createdHeadStartResource ? createdHeadStartResource.id : 0],
          },
          individualHooks: false,
          force: true,
        });
      });

      beforeEach(() => {
        urls = urlsTest;
      });
      afterEach(async () => {
        await Resource.destroy({
          where: { url: { [Op.in]: urlsTest } },
          individualHooks: true,
        });
      });
      it('expected usage, new', async () => {
        const resources = await findOrCreateResources(urls);
        expect(resources.length).toBe(2);
      });
      it('expected usage, existing', async () => {
        const resources1 = await findOrCreateResources(urls);
        const resources2 = await findOrCreateResources(urls);
        expect(resources2.sort(sorter)).toMatchObject(resources1.sort(sorter));
      });
      it('expected usage, concurrent existing', async () => {
        const [resources1, resources2] = await Promise.all([
          findOrCreateResources(urls),
          findOrCreateResources(urls),
        ]);
        expect(resources2.sort(sorter)).toMatchObject(resources1.sort(sorter));
      });
      it('fail to empty array, null urls', async () => {
        urls = null;
        const resources = await findOrCreateResources(urls);
        expect(resources).toMatchObject([]);
      });
      it('fail to empty array, undefined urls', async () => {
        urls = undefined;
        const resources = await findOrCreateResources(urls);
        expect(resources).toMatchObject([]);
      });
      it('fail to empty array, number urls', async () => {
        urls = 0;
        const resources = await findOrCreateResources(urls);
        expect(resources).toMatchObject([]);
      });
      it('fail to empty array, string urls', async () => {
        urls = 'a';
        const resources = await findOrCreateResources(urls);
        expect(resources).toMatchObject([]);
      });
      it('fail to empty array, object urls', async () => {
        urls = {};
        const resources = await findOrCreateResources(urls);
        expect(resources).toMatchObject([]);
      });

      it('maps to an existing headstart.gov resource if the url is ECLKC', async () => {
        const resources = await findOrCreateResources(['https://eclkc.ohs.acf.hhs.gov/existing', 'https://eclkc.ohs.acf.hhs.gov/notexisting']);
        expect(resources.length).toBe(2);
        // Verify eclkc with and existing headstart.gov
        createdECLKCResource = resources.find((r) => (r.url === 'https://eclkc.ohs.acf.hhs.gov/existing'));
        expect(createdECLKCResource.url).toBe('https://eclkc.ohs.acf.hhs.gov/existing');
        expect(createdECLKCResource.mapsTo).toBe(existingHeadStartResource.id);

        // Find the headstart url we auto created.
        createdHeadStartResource = await Resource.findOne({
          where: { url: 'https://headstart.gov/notexisting' },
        });
        expect(createdHeadStartResource).not.toBeNull();
        expect(createdHeadStartResource.domain).toBe('headstart.gov');

        // Verify eclkc with the auto created headstart url.
        createdECLKCResource2 = resources.find((r) => (r.url === 'https://eclkc.ohs.acf.hhs.gov/notexisting'));
        expect(createdECLKCResource2.url).toBe('https://eclkc.ohs.acf.hhs.gov/notexisting');
        expect(createdECLKCResource2.mapsTo).toBe(createdHeadStartResource.id);
      });
    });
  });
  describe('Helper functions', () => {
    describe('calculateIsAutoDetected', () => {
      let sourceFields;
      let autoDetectedFields;
      beforeEach(() => {
        sourceFields = ['a', 'b', 'c'];
        autoDetectedFields = ['x', 'y', 'z'];
      });
      it('pass with full overlap', () => {
        autoDetectedFields = ['a', 'b', 'c'];
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(true);
      });
      it('pass with partial overlap', () => {
        sourceFields = ['a', 'b'];
        autoDetectedFields = ['b', 'c'];
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(true);
      });
      it('fail with no overlap', () => {
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(false);
      });
      it('fail with empty sourceFields', () => {
        sourceFields = [];
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(false);
      });
      it('fail with null sourceFields', () => {
        sourceFields = null;
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(false);
      });
      it('fail with undefined sourceFields', () => {
        sourceFields = undefined;
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(false);
      });
      it('fail with numeric sourceFields', () => {
        sourceFields = 0;
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(false);
      });
      it('fail with string sourceFields', () => {
        sourceFields = 'm';
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(false);
      });
      it('fail with object sourceFields', () => {
        sourceFields = {};
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(false);
      });
      it('fail with empty autoDetectedFields', () => {
        autoDetectedFields = [];
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(false);
      });
      it('fail with null autoDetectedFields', () => {
        autoDetectedFields = null;
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(false);
      });
      it('fail with undefined autoDetectedFields', () => {
        autoDetectedFields = undefined;
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(false);
      });
      it('fail with numeric autoDetectedFields', () => {
        autoDetectedFields = 0;
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(false);
      });
      it('fail with string autoDetectedFields', () => {
        autoDetectedFields = 'm';
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(false);
      });
      it('fail with object autoDetectedFields', () => {
        autoDetectedFields = {};
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(false);
      });
    });
    describe('remapAttributes', () => {
      let collection;
      let from;
      let to;
      beforeEach(() => {
        collection = [{ a: 0 }];
        from = 'a';
        to = 'b';
      });
      it('expected usage', () => {
        expect(remapAttributes(collection, from, to)).toMatchObject([{ b: 0 }]);
      });
      it('fail to empty, null collection', () => {
        collection = null;
        expect(remapAttributes(collection, from, to)).toMatchObject([]);
      });
      it('fail to empty, undefined collection', () => {
        collection = undefined;
        expect(remapAttributes(collection, from, to)).toMatchObject([]);
      });
      it('fail to empty, string collection', () => {
        collection = 'a';
        expect(remapAttributes(collection, from, to)).toMatchObject([]);
      });
      it('fail to empty, number collection', () => {
        collection = 0;
        expect(remapAttributes(collection, from, to)).toMatchObject([]);
      });
      it('fail to empty, object collection', () => {
        collection = {};
        expect(remapAttributes(collection, from, to)).toMatchObject([]);
      });
      it('fail to empty, null from', () => {
        from = null;
        expect(remapAttributes(collection, from, to)).toMatchObject([]);
      });
      it('fail to empty, undefined from', () => {
        from = undefined;
        expect(remapAttributes(collection, from, to)).toMatchObject([]);
      });
      it('fail to empty, array from', () => {
        from = [];
        expect(remapAttributes(collection, from, to)).toMatchObject([]);
      });
      it('fail to empty, number from', () => {
        from = 0;
        expect(remapAttributes(collection, from, to)).toMatchObject([]);
      });
      it('fail to empty, object from', () => {
        from = {};
        expect(remapAttributes(collection, from, to)).toMatchObject([]);
      });
      it('fail to empty, null to', () => {
        to = null;
        expect(remapAttributes(collection, from, to)).toMatchObject([]);
      });
      it('fail to empty, undefined to', () => {
        to = undefined;
        expect(remapAttributes(collection, from, to)).toMatchObject([]);
      });
      it('fail to empty, array to', () => {
        to = [];
        expect(remapAttributes(collection, from, to)).toMatchObject([]);
      });
      it('fail to empty, number to', () => {
        to = 0;
        expect(remapAttributes(collection, from, to)).toMatchObject([]);
      });
      it('fail to empty, object to', () => {
        to = {};
        expect(remapAttributes(collection, from, to)).toMatchObject([]);
      });
    });
    describe('collectURLsFromField', () => {
      let field;
      beforeEach(() => {
        field = 'abc http://google.com abc';
      });
      it('expected usage, single', () => {
        expect(collectURLsFromField(field)).toEqual(['http://google.com']);
      });
      it('expected usage, multiple', () => {
        field = 'abc http://google.com http://github.com abc';
        expect(collectURLsFromField(field)).toEqual(['http://google.com', 'http://github.com']);
      });
      it('expected usage, multiple dedupe', () => {
        field = 'abc http://google.com http://google.com abc';
        expect(collectURLsFromField(field)).toEqual(['http://google.com']);
      });
      it('bulk success', () => {
        field = `
        http://foo.com/blah_blah
        http://foo.com/blah_blah/
        http://foo.com/blah_blah_(wikipedia)
        http://foo.com/blah_blah_(wikipedia)_(again)
        http://www.example.com/wpstyle/?p=364
        https://www.example.com/foo/?bar=baz&inga=42&quux
        http://userid:password@example.com:8080
        http://userid:password@example.com:8080/
        http://userid@example.com
        http://userid@example.com/
        http://userid@example.com:8080
        http://userid@example.com:8080/
        http://userid:password@example.com
        http://userid:password@example.com/
        http://142.42.1.1/
        http://142.42.1.1:8080/
        http://foo.com/blah_(wikipedia)#cite-1
        http://foo.com/blah_(wikipedia)_blah#cite-1
        http://foo.com/(something)?after=parens
        http://code.google.com/events/#&product=browser
        http://j.mp
        http://foo.bar/?q=Test%20URL-encoded%20stuff
        http://1337.net
        http://223.255.255.254
        https://foo_bar.example.com/
        http://a.b-c.de
        `;
        expect(collectURLsFromField(field).length).toEqual(26);
      });
      it('bulk non-match', () => {
        field = `
        ftp://foo.bar/baz
        http://✪df.ws/123
        http://➡.ws/䨹
        http://⌘.ws
        http://⌘.ws/
        http://☺.damowmow.com/
        http://مثال.إختبار
        http://例子.测试
        http://उदाहरण.परीक्षा
        http://-.~_!$&'()*+,;=:%40:80%2f::::::@example.com
        http://
        http://.
        http://..
        http://../
        http://?
        http://??
        http://??/
        http://#
        http://##
        http://##/
        //
        //a
        ///a
        ///
        http:///a
        foo.com
        rdar://1234
        h://test
        http:// shouldfail.com
        :// should fail
        http://123.123.123
        http://3628126748
        `;
        expect(collectURLsFromField(field).length).toEqual(0);
      });
      it('fail to empty, null field', () => {
        field = null;
        expect(collectURLsFromField(field).length).toEqual(0);
      });
      it('fail to empty, undefined field', () => {
        field = undefined;
        expect(collectURLsFromField(field).length).toEqual(0);
      });
      it('fail to empty, number field', () => {
        field = 0;
        expect(collectURLsFromField(field).length).toEqual(0);
      });
      it('fail to empty, array field', () => {
        field = [];
        expect(collectURLsFromField(field).length).toEqual(0);
      });
      it('fail to empty, object field', () => {
        field = {};
        expect(collectURLsFromField(field).length).toEqual(0);
      });
    });
    describe('resourcesFromField', () => {
      let genericId;
      let urlsFromField;
      let field;
      let seed;
      beforeEach(async () => {
        genericId = 1;
        urlsFromField = ['http://google.com', 'http://github.com', 'http://youtube.com'];
        field = 'test';
        seed = [];
      });
      it('expected use pattern', () => {
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject([
            {
              sourceFields: [field],
              genericId,
              url: urlsFromField[0],
            },
            {
              sourceFields: [field],
              genericId,
              url: urlsFromField[1],
            },
            {
              sourceFields: [field],
              genericId,
              url: urlsFromField[2],
            },
          ]);
      });
      it('dedup urls', () => {
        urlsFromField = ['http://google.com', 'http://google.com', 'http://google.com'];
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject([
            {
              sourceFields: [field],
              genericId,
              url: urlsFromField[0],
            },
          ]);
      });
      it('Add to existing data passed in seed', () => {
        seed = [{
          sourceFields: ['prior test'],
          genericId,
          url: urlsFromField[0],
        }];
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject([
            {
              sourceFields: ['prior test', field],
              genericId,
              url: urlsFromField[0],
            },
            {
              sourceFields: [field],
              genericId,
              url: urlsFromField[1],
            },
            {
              sourceFields: [field],
              genericId,
              url: urlsFromField[2],
            },
          ]);
      });
      it('Add to existing data passed in seed with different genericId', () => {
        seed = [{
          sourceFields: ['prior test'],
          genericId: 2,
          url: urlsFromField[0],
        }];
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject([
            {
              sourceFields: ['prior test'],
              genericId: 2,
              url: urlsFromField[0],
            },
            {
              sourceFields: [field],
              genericId,
              url: urlsFromField[0],
            },
            {
              sourceFields: [field],
              genericId,
              url: urlsFromField[1],
            },
            {
              sourceFields: [field],
              genericId,
              url: urlsFromField[2],
            },
          ]);
      });
      it('return seed on bad input, with null genericId', () => {
        genericId = null;
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
      it('return seed on bad input, with undefined genericId', () => {
        genericId = undefined;
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
      it('return seed on bad input, with string genericId', () => {
        genericId = 'a';
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
      it('return seed on bad input, with object genericId', () => {
        genericId = {};
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
      it('return seed on bad input, with array genericId', () => {
        genericId = [];
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
      it('return seed on bad input, with float genericId', () => {
        genericId = 0.5;
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
      it('return seed on bad input, with null urlsFromField', () => {
        urlsFromField = null;
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
      it('return seed on bad input, with undefined urlsFromField', () => {
        urlsFromField = undefined;
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
      it('return seed on bad input, with string urlsFromField', () => {
        urlsFromField = 'a';
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
      it('return seed on bad input, with object urlsFromField', () => {
        urlsFromField = {};
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
      it('return seed on bad input, with number urlsFromField', () => {
        urlsFromField = 0;
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
      it('return seed on bad input, with null field', () => {
        field = null;
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
      it('return seed on bad input, with undefined field', () => {
        field = undefined;
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
      it('return seed on bad input, with number field', () => {
        field = 0;
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
      it('return seed on bad input, with object field', () => {
        field = {};
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
      it('return seed on bad input, with array field', () => {
        field = [];
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
      it('return seed on bad input, with null seed', () => {
        seed = null;
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toBeNull();
      });
      it('return expected value, with undefined seed', () => {
        seed = undefined;
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject([
            {
              sourceFields: [field],
              genericId,
              url: urlsFromField[0],
            },
            {
              sourceFields: [field],
              genericId,
              url: urlsFromField[1],
            },
            {
              sourceFields: [field],
              genericId,
              url: urlsFromField[2],
            },
          ]);
      });
      it('return seed on bad input, with number seed', () => {
        seed = 0;
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toBe(seed);
      });
      it('return seed on bad input, with string seed', () => {
        seed = 'a';
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toBe(seed);
      });
      it('return seed on bad input, with object seed', () => {
        seed = {};
        expect(resourcesFromField(genericId, urlsFromField, field, seed))
          .toMatchObject(seed);
      });
    });
    describe('mergeRecordsByUrlAndGenericId', () => {
      let records;
      beforeEach(() => {
        records = [
          { genericId: 1, sourceFields: ['a'], url: 'http://google.com' },
          { genericId: 1, sourceFields: ['b'], url: 'http://google.com' },
          { genericId: 1, sourceFields: ['c'], url: 'http://youtube.com' },
        ];
      });
      it('expected usage, single genericId', () => {
        expect(mergeRecordsByUrlAndGenericId(records))
          .toMatchObject([
            { genericId: 1, sourceFields: ['a', 'b'], url: 'http://google.com' },
            { genericId: 1, sourceFields: ['c'], url: 'http://youtube.com' },
          ]);
      });
      it('expected usage, multiple genericId', () => {
        records = [...records, { genericId: 2, sourceFields: ['c'], url: 'http://youtube.com' }];
        expect(mergeRecordsByUrlAndGenericId(records))
          .toMatchObject([
            { genericId: 1, sourceFields: ['a', 'b'], url: 'http://google.com' },
            { genericId: 1, sourceFields: ['c'], url: 'http://youtube.com' },
            { genericId: 2, sourceFields: ['c'], url: 'http://youtube.com' },
          ]);
      });
      it('only return valid records', () => {
        records = [
          ...records,
          { genericId: null, sourceFields: ['c'], url: 'http://youtube.com' },
          { genericId: undefined, sourceFields: ['c'], url: 'http://youtube.com' },
          { genericId: [], sourceFields: ['c'], url: 'http://youtube.com' },
          { genericId: {}, sourceFields: ['c'], url: 'http://youtube.com' },
          { genericId: 'a', sourceFields: ['c'], url: 'http://youtube.com' },
          { genericId: 2, sourceFields: ['c'], url: null },
          { genericId: 2, sourceFields: ['c'], url: undefined },
          { genericId: 2, sourceFields: ['c'], url: [] },
          { genericId: 2, sourceFields: ['c'], url: {} },
          { genericId: 2, sourceFields: ['c'], url: 0 },
          { genericId: 1, sourceFields: null, url: 'http://youtube.com' },
          { genericId: 1, sourceFields: undefined, url: 'http://youtube.com' },
          { genericId: 1, sourceFields: {}, url: 'http://youtube.com' },
          { genericId: 1, sourceFields: 'a', url: 'http://youtube.com' },
          { genericId: 1, sourceFields: 0, url: 'http://youtube.com' },
        ];
        expect(mergeRecordsByUrlAndGenericId(records))
          .toMatchObject([
            { genericId: 1, sourceFields: ['a', 'b'], url: 'http://google.com' },
            { genericId: 1, sourceFields: ['c'], url: 'http://youtube.com' },
          ]);
      });
      it('fail resulting in returning an empty array, when records is null', () => {
        records = null;
        expect(mergeRecordsByUrlAndGenericId(records))
          .toMatchObject([]);
      });
      it('fail resulting in returning an empty array, when records is undefined', () => {
        records = undefined;
        expect(mergeRecordsByUrlAndGenericId(records))
          .toMatchObject([]);
      });
      it('fail resulting in returning an empty array, when records is number', () => {
        records = 0;
        expect(mergeRecordsByUrlAndGenericId(records))
          .toMatchObject([]);
      });
      it('fail resulting in returning an empty array, when records is string', () => {
        records = 'a';
        expect(mergeRecordsByUrlAndGenericId(records))
          .toMatchObject([]);
      });
      it('fail resulting in returning an empty array, when records is object', () => {
        records = {};
        expect(mergeRecordsByUrlAndGenericId(records))
          .toMatchObject([]);
      });
    });
    describe('transformRecordByURLToResource', () => {
      let records;
      let resources;
      beforeEach(() => {
        records = [
          { url: 'http://google.com' },
          { url: 'http://github.com' },
          { url: 'http://youtube.com' },
        ];
        resources = [
          { id: 1, url: 'http://google.com' },
          { id: 2, url: 'http://github.com' },
          { id: 3, url: 'http://youtube.com' },
        ];
      });
      it('expected usage', () => {
        expect(transformRecordByURLToResource(records, resources))
          .toMatchObject([
            { resourceId: 1 },
            { resourceId: 2 },
            { resourceId: 3 },
          ]);
      });
      it('ignore extra urls in resources', () => {
        resources = [
          ...resources,
          { id: 4, url: 'http://microsoft.com' },
        ];
        expect(transformRecordByURLToResource(records, resources))
          .toMatchObject([
            { resourceId: 1 },
            { resourceId: 2 },
            { resourceId: 3 },
          ]);
      });
      it('ignore extra records with unmatched resource', () => {
        records = [
          ...records,
          { url: 'http://microsoft.com' },
        ];
        expect(transformRecordByURLToResource(records, resources))
          .toMatchObject([
            { resourceId: 1 },
            { resourceId: 2 },
            { resourceId: 3 },
          ]);
      });
      it('fail to empty array when records is null', () => {
        records = null;
        expect(transformRecordByURLToResource(records, resources))
          .toMatchObject([]);
      });
      it('fail to empty array when records is undefined', () => {
        records = undefined;
        expect(transformRecordByURLToResource(records, resources))
          .toMatchObject([]);
      });
      it('fail to empty array when records is number', () => {
        records = 0;
        expect(transformRecordByURLToResource(records, resources))
          .toMatchObject([]);
      });
      it('fail to empty array when records is string', () => {
        records = 'a';
        expect(transformRecordByURLToResource(records, resources))
          .toMatchObject([]);
      });
      it('fail to empty array when records is object', () => {
        records = {};
        expect(transformRecordByURLToResource(records, resources))
          .toMatchObject([]);
      });
      it('fail to empty array when resources is null', () => {
        resources = null;
        expect(transformRecordByURLToResource(records, resources))
          .toMatchObject([]);
      });
      it('fail to empty array when resources is undefined', () => {
        resources = undefined;
        expect(transformRecordByURLToResource(records, resources))
          .toMatchObject([]);
      });
      it('fail to empty array when resources is number', () => {
        resources = 0;
        expect(transformRecordByURLToResource(records, resources))
          .toMatchObject([]);
      });
      it('fail to empty array when resources is string', () => {
        resources = 'a';
        expect(transformRecordByURLToResource(records, resources))
          .toMatchObject([]);
      });
      it('fail to empty array when resources is object', () => {
        resources = {};
        expect(transformRecordByURLToResource(records, resources))
          .toMatchObject([]);
      });
    });
    describe('filterResourcesForSync', () => {
      let incomingResources;
      let currentResources;
      let calculateIsAutoDetectedFunc;
      beforeEach(() => {
        incomingResources = [
          { genericId: 1, sourceFields: ['a'], resourceId: 1 }, // new
          { genericId: 1, sourceFields: ['b', 'c'], resourceId: 2 }, // expand
          { genericId: 1, sourceFields: ['d'], resourceId: 3 }, // delta
          { genericId: 1, sourceFields: ['f'], resourceId: 4 }, // reduce
        ];
        currentResources = [
          { genericId: 1, sourceFields: ['b'], resourceId: 2 }, // expand
          { genericId: 1, sourceFields: ['e'], resourceId: 3 }, // delta
          { genericId: 1, sourceFields: ['f', 'g'], resourceId: 4 }, // reduce
          { genericId: 1, sourceFields: ['h'], resourceId: 5 }, // remove
        ];
        calculateIsAutoDetectedFunc = (sourceFields) => calculateIsAutoDetected(sourceFields, ['b', 'd', 'h']);
      });
      it('expected usage', () => {
        expect(filterResourcesForSync(
          incomingResources,
          currentResources,
        ))
          .toMatchObject({
            create: [{
              genericId: 1,
              sourceFields: ['a'],
              resourceId: 1,
            }],
            update: [
              {
                genericId: 1,
                sourceFields: ['b', 'c'],
                resourceId: 2,
              }, // expand
              {
                genericId: 1,
                sourceFields: ['d'],
                resourceId: 3,
              }, // delta
              {
                genericId: 1,
                sourceFields: ['f'],
                resourceId: 4,
              }, // reduce
            ],
            destroy: [{ genericId: 1, resourceIds: [5] }],
          });
      });
      it('expected usage, empty incomingResources', () => {
        incomingResources = [];
        expect(filterResourcesForSync(
          incomingResources,
          currentResources,
        ))
          .toMatchObject({
            create: [],
            update: [],
            destroy: [{ genericId: 1, resourceIds: [2, 3, 4, 5] }],
          });
      });
      it('expected usage, empty currentResources', () => {
        currentResources = [];
        expect(filterResourcesForSync(
          incomingResources,
          currentResources,
        ))
          .toMatchObject({
            create: [
              {
                genericId: 1,
                sourceFields: ['a'],
                resourceId: 1,
              },
              {
                genericId: 1,
                sourceFields: ['b', 'c'],
                resourceId: 2,
              },
              {
                genericId: 1,
                sourceFields: ['d'],
                resourceId: 3,
              },
              {
                genericId: 1,
                sourceFields: ['f'],
                resourceId: 4,
              },
            ],
            update: [],
            destroy: [],
          });
      });
      it('expected usage, empty incomingResources and currentResources', () => {
        incomingResources = [];
        currentResources = [];
        expect(filterResourcesForSync(
          incomingResources,
          currentResources,
          calculateIsAutoDetectedFunc,
        ))
          .toMatchObject({
            create: [],
            update: [],
            destroy: [],
          });
      });
      it('fail to empty object, undefined incomingResources', () => {
        incomingResources = undefined;
        expect(filterResourcesForSync(
          incomingResources,
          currentResources,
        ))
          .toMatchObject({
            create: [],
            update: [],
            destroy: [],
          });
      });
      it('fail to empty object, number incomingResources', () => {
        incomingResources = 0;
        expect(filterResourcesForSync(
          incomingResources,
          currentResources,
        ))
          .toMatchObject({
            create: [],
            update: [],
            destroy: [],
          });
      });
      it('fail to empty object, string incomingResources', () => {
        incomingResources = 'a';
        expect(filterResourcesForSync(
          incomingResources,
          currentResources,
        ))
          .toMatchObject({
            create: [],
            update: [],
            destroy: [],
          });
      });
      it('fail to empty object, object incomingResources', () => {
        incomingResources = {};
        expect(filterResourcesForSync(
          incomingResources,
          currentResources,
        ))
          .toMatchObject({
            create: [],
            update: [],
            destroy: [],
          });
      });
      it('fail to empty object, undefined currentResources', () => {
        currentResources = undefined;
        expect(filterResourcesForSync(
          incomingResources,
          currentResources,
        ))
          .toMatchObject({
            create: [],
            update: [],
            destroy: [],
          });
      });
      it('fail to empty object, number currentResources', () => {
        currentResources = 0;
        expect(filterResourcesForSync(
          incomingResources,
          currentResources,
        ))
          .toMatchObject({
            create: [],
            update: [],
            destroy: [],
          });
      });
      it('fail to empty object, string currentResources', () => {
        currentResources = 'a';
        expect(filterResourcesForSync(
          incomingResources,
          currentResources,
        ))
          .toMatchObject({
            create: [],
            update: [],
            destroy: [],
          });
      });
      it('fail to empty object, object currentResources', () => {
        currentResources = {};
        expect(filterResourcesForSync(
          incomingResources,
          currentResources,
        ))
          .toMatchObject({
            create: [],
            update: [],
            destroy: [],
          });
      });
    });
  });
  describe('ActivityReports Resource Processing', () => {
    describe('calculateIsAutoDetectedForActivityReport', () => {
      let sourceFields;
      it('returns false when context changes', () => {
        sourceFields = [SOURCE_FIELD.REPORT.CONTEXT];
        expect(calculateIsAutoDetectedForActivityReport(sourceFields)).toEqual(false);
      });
      it('returns false when context and notes change', () => {
        sourceFields = [SOURCE_FIELD.REPORT.CONTEXT, SOURCE_FIELD.REPORT.NOTES];
        expect(calculateIsAutoDetectedForActivityReport(sourceFields)).toEqual(false);
      });
      it('returns false when mixed with ECLKC', () => {
        sourceFields = [SOURCE_FIELD.REPORT.CONTEXT, SOURCE_FIELD.REPORT.ECLKC];
        expect(calculateIsAutoDetectedForActivityReport(sourceFields)).toEqual(false);
      });
      it('expected usage, non-auto-detected single', () => {
        sourceFields = [SOURCE_FIELD.REPORT.ECLKC];
        expect(calculateIsAutoDetectedForActivityReport(sourceFields)).toEqual(false);
      });
      it('expected usage, non-auto-detected multiple', () => {
        sourceFields = [SOURCE_FIELD.REPORT.ECLKC, SOURCE_FIELD.REPORT.NONECLKC];
        expect(calculateIsAutoDetectedForActivityReport(sourceFields)).toEqual(false);
      });
      // Note all fail cases handled by helper function tests for calculateIsAutoDetected
    });
    describe('syncResourcesForActivityReport', () => {
      let resources;
      beforeAll(async () => {
      });
      beforeEach(async () => {
        const urls = [
          'http://google.com',
          'http://github.com',
          'http://cloud.gov',
          'https://adhocteam.us/',
        ];
        resources = await findOrCreateResources(urls);
      });
      afterEach(async () => {
        await ActivityReportResource.destroy({
          where: {
            activityReportId: 9999,
            resourceId: { [Op.in]: resources.map((r) => r.id) },
          },
          individualHooks: true,
        });
      });
      afterAll(async () => {
        await Resource.destroy({
          where: { id: { [Op.in]: resources.map((r) => r.id) } },
          individualHooks: true,
        });
      });
      it('expected usage, insert', async () => {
        const data = {
          create: [
            {
              activityReportId: 9999,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC],
              isAutoDetected: false,
            },
            {
              activityReportId: 9999,
              resourceId: resources[1].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC],
              isAutoDetected: false,
            },
            {
              activityReportId: 9999,
              resourceId: resources[2].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC],
              isAutoDetected: false,
            },
            {
              activityReportId: 9999,
              resourceId: resources[3].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC],
              isAutoDetected: false,
            },
          ],
          update: [],
          destroy: [],
        };
        await syncResourcesForActivityReport(data);
        const arResources = await ActivityReportResource.findAll({
          where: {
            activityReportId: 9999,
            resourceId: { [Op.in]: resources.map((r) => r.id) },
          },
          include: [
            { model: Resource, as: 'resource' },
          ],
          raw: true,
        });
        expect(arResources.length).toEqual(4);
      });
      it('expected usage, update', async () => {
        let data = {
          create: [
            {
              activityReportId: 9999,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC],
              isAutoDetected: false,
            },
            {
              activityReportId: 9999,
              resourceId: resources[1].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC],
              isAutoDetected: false,
            },
            {
              activityReportId: 9999,
              resourceId: resources[2].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC],
              isAutoDetected: false,
            },
            {
              activityReportId: 9999,
              resourceId: resources[3].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC],
              isAutoDetected: false,
            },
          ],
          update: [],
          destroy: [],
        };
        await syncResourcesForActivityReport(data);
        data = {
          create: [],
          update: [
            {
              activityReportId: 9999,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC, SOURCE_FIELD.REPORT.CONTEXT],
              isAutoDetected: true,
            },
          ],
          destroy: [],
        };
        await syncResourcesForActivityReport(data);
        const arResources = await ActivityReportResource.findAll({
          where: { activityReportId: 9999, resourceId: resources[0].id },
          include: [
            { model: Resource, as: 'resource' },
          ],
          // raw: true,
        });
        expect(arResources.find((r) => r.resourceId === resources[0].id).sourceFields.length)
          .toEqual(2);
        expect(arResources.find((r) => r.resourceId === resources[0].id).isAutoDetected)
          .toEqual(true);
      });
      it('expected usage, delete', async () => {
        let data = {
          create: [
            {
              activityReportId: 9999,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC],
              isAutoDetected: false,
            },
            {
              activityReportId: 9999,
              resourceId: resources[1].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC],
              isAutoDetected: false,
            },
            {
              activityReportId: 9999,
              resourceId: resources[2].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC],
              isAutoDetected: false,
            },
            {
              activityReportId: 9999,
              resourceId: resources[3].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC],
              isAutoDetected: false,
            },
          ],
          update: [],
          destroy: [],
        };
        await syncResourcesForActivityReport(data);
        data = {
          create: [],
          update: [],
          destroy: [
            {
              activityReportId: 9999,
              resourceIds: resources.map((r) => r.id),
            },
          ],
        };
        await syncResourcesForActivityReport(data);
        const arResources = await ActivityReportResource.findAll({
          where: {
            activityReportId: 9999,
            resourceId: { [Op.in]: resources.map((r) => r.id) },
          },
          raw: true,
        });
        expect(arResources.length).toEqual(0);
      });
      it('expected usage, insert/update/delete', async () => {
        let data = {
          create: [
            {
              activityReportId: 9999,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC],
              isAutoDetected: false,
            },
            {
              activityReportId: 9999,
              resourceId: resources[1].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC],
              isAutoDetected: false,
            },
            {
              activityReportId: 9999,
              resourceId: resources[2].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC],
              isAutoDetected: false,
            },
          ],
          update: [],
          destroy: [],
        };
        await syncResourcesForActivityReport(data);
        data = {
          create: [
            {
              activityReportId: 9999,
              resourceId: resources[3].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC],
              isAutoDetected: false,
            },
          ],
          update: [
            {
              activityReportId: 9999,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.REPORT.NONECLKC, SOURCE_FIELD.REPORT.CONTEXT],
              isAutoDetected: true,
            },
          ],
          destroy: [
            {
              activityReportId: 9999,
              resourceIds: [resources[1].id],
            },
          ],
        };
        await syncResourcesForActivityReport(data);
        const arResources = await ActivityReportResource.findAll({
          where: {
            activityReportId: 9999,
            resourceId: { [Op.in]: resources.map((r) => r.id) },
          },
        });
        expect(arResources.length).toEqual(3);
        expect(arResources.map((r) => r.dataValues.resourceId)).toContain(resources[3].id);
        expect(arResources.map((r) => r.dataValues.resourceId)).not.toContain(resources[1].id);
        expect(arResources
          .find((r) => r.dataValues.resourceId === resources[0].id).dataValues.sourceFields.length)
          .toEqual(2);
        expect(arResources.find((r) => r.dataValues.resourceId === resources[0].id).isAutoDetected)
          .toEqual(true);
      });
    });
    describe('processActivityReportForResourcesById', () => {
      let resources;
      let activityReport;
      let deleteReport;
      const urls = [
        'http://google.com',
        'http://github.com',
        'http://cloud.gov',
        'https://adhocteam.us/',
      ];
      beforeAll(async () => {
        [activityReport, deleteReport] = await ActivityReport.findOrCreate({
          where: {
            id: 1999991,
          },
          defaults: {
            context: 'Resource Report test. http://google.com',
            submissionStatus: REPORT_STATUSES.DRAFT,
            calculatedStatus: REPORT_STATUSES.DRAFT,
            numberOfParticipants: 1,
            deliveryMethod: 'method',
            duration: 0,
            endDate: '2020-01-01T12:00:00Z',
            startDate: '2020-01-01T12:00:00Z',
            requester: 'requester',
            regionId: 1,
            targetPopulations: [],
            version: 2,
          },
          individualHooks: true,
          raw: true,
        });
      });
      beforeEach(async () => {
        resources = await findOrCreateResources(urls);
      });
      afterEach(async () => {
        await ActivityReportResource.destroy({
          where: { activityReportId: activityReport.id },
          individualHooks: true,
        });
      });
      afterAll(async () => {
        await Resource.destroy({
          where: { url: { [Op.in]: urls } },
          individualHooks: true,
        });
        if (deleteReport) {
          await ActivityReport.destroy({
            where: { id: activityReport.id },
            individualHooks: true,
          });
        }
      });
      it('expected usage, empty urls', async () => {
        const arResources = await processActivityReportForResourcesById(activityReport.id, []);

        expect(arResources.length).toEqual(1);
        expect(arResources
          .find((r) => r.dataValues.resource.dataValues.url === urls[0]).dataValues.resourceId)
          .toEqual(resources.find((r) => r.url === urls[0]).id);
        expect(arResources
          .find((r) => r.dataValues.resource.dataValues.url === urls[0])
          .dataValues.sourceFields.sort())
          .toEqual([
            SOURCE_FIELD.REPORT.CONTEXT,
          ].sort());
      });
      it('expected usage, with urls', async () => {
        const arResources = await processActivityReportForResourcesById(
          activityReport.id,
          urls,
        );
        expect(arResources.length).toEqual(4);
        arResources.forEach((resource) => {
          expect(resource.dataValues.sourceFields.sort())
            .toEqual([SOURCE_FIELD.REPORT.RESOURCE]);
        });
      });
      it('expected usage, add and remove urls', async () => {
        let arResources = await processActivityReportForResourcesById(
          activityReport.id,
          [],
        );
        expect(arResources.length).toEqual(0);
        arResources = await processActivityReportForResourcesById(
          activityReport.id,
          [urls[0]],
        );
        expect(arResources.length).toEqual(1);
        expect(arResources
          .find((r) => r.dataValues.resource.dataValues.url === urls[0])
          .dataValues.sourceFields.sort())
          .toEqual([
            SOURCE_FIELD.REPORT.CONTEXT,
            SOURCE_FIELD.REPORT.RESOURCE,
          ].sort());
        arResources = await processActivityReportForResourcesById(
          activityReport.id,
          [urls[0]],
        );
        expect(arResources.length).toEqual(1);
        expect(arResources[0].resource.dataValues.url).toEqual(urls[1]);
        expect(arResources[0].dataValues.sourceFields.sort())
          .toEqual([
            SOURCE_FIELD.REPORT.CONTEXT,
            SOURCE_FIELD.REPORT.RESOURCE,
          ].sort());

        arResources = await processActivityReportForResourcesById(
          activityReport.id,
          [urls[1]],
        );
        expect(arResources.length).toEqual(4);
        expect(arResources
          .find((r) => r.dataValues.resource.dataValues.url === urls[0])
          .dataValues.sourceFields.sort())
          .toEqual([
            SOURCE_FIELD.REPORT.CONTEXT,
            SOURCE_FIELD.REPORT.RESOURCE,
          ].sort());
        expect(arResources
          .find((r) => r.dataValues.resource.dataValues.url === urls[1])
          .dataValues.sourceFields.sort())
          .toEqual([
            SOURCE_FIELD.REPORT.RESOURCE,
          ].sort());

        arResources = await processActivityReportForResourcesById(
          activityReport.id,
          urls,
        );
        expect(arResources.length).toEqual(4);
        expect(arResources
          .find((r) => r.dataValues.resource.dataValues.url === urls[0])
          .dataValues.sourceFields.sort())
          .toEqual([
            SOURCE_FIELD.REPORT.CONTEXT,
            SOURCE_FIELD.REPORT.RESOURCE,
          ].sort());
        expect(arResources
          .find((r) => r.dataValues.resource.dataValues.url === urls[1])
          .dataValues.sourceFields.sort())
          .toEqual([
            SOURCE_FIELD.REPORT.RESOURCE,
          ].sort());

        arResources = await processActivityReportForResourcesById(
          activityReport.id,
          [],
        );
        expect(arResources.length).toEqual(1);
        expect(arResources[0].resource.dataValues.url).toEqual(urls[0]);
        expect(arResources[0].dataValues.sourceFields.sort())
          .toEqual([
            SOURCE_FIELD.REPORT.CONTEXT,
          ].sort());
      });
    });
  });
  describe('NextSteps Resource Processing', () => {
    describe('calculateIsAutoDetectedForNextSteps', () => {
      let sourceFields;
      it('returns false for note fields', () => {
        sourceFields = [SOURCE_FIELD.NEXTSTEPS.NOTE];
        expect(calculateIsAutoDetectedForNextStep(sourceFields)).toEqual(false);
      });
      it('returns false when note and resource are present', () => {
        sourceFields = [SOURCE_FIELD.NEXTSTEPS.NOTE, SOURCE_FIELD.NEXTSTEPS.RESOURCE];
        expect(calculateIsAutoDetectedForNextStep(sourceFields)).toEqual(false);
      });
      it('expected usage, non-auto-detected single', () => {
        sourceFields = [SOURCE_FIELD.NEXTSTEPS.RESOURCE];
        expect(calculateIsAutoDetectedForNextStep(sourceFields)).toEqual(false);
      });
      // Note all fail cases handled by helper function tests for calculateIsAutoDetected
    });
    describe('syncResourcesForNextStep', () => {
      let resources;
      let nextStep;
      const urls = [
        'http://google.com',
        'http://github.com',
        'http://cloud.gov',
        'https://adhocteam.us/',
      ];
      beforeAll(async () => {
        [nextStep] = await NextStep.findOrCreate({
          where: {
            activityReportId: 9999,
            note: 'Resource NextStep test. http://google.com',
            noteType: NEXTSTEP_NOTETYPE.SPECIALIST,
          },
          individualHooks: true,
          raw: true,
        });
      });
      beforeEach(async () => {
        resources = await findOrCreateResources(urls);
      });
      afterEach(async () => {
        await NextStepResource.destroy({
          where: {
            nextStepId: nextStep.id,
            resourceId: { [Op.in]: resources.map((r) => r.id) },
          },
          individualHooks: true,
        });
      });
      afterAll(async () => {
        await Resource.destroy({
          where: { id: { [Op.in]: resources.map((r) => r.id) } },
          individualHooks: true,
        });
        await NextStep.destroy({
          where: {
            id: nextStep.id,
          },
          individualHooks: true,
        });
      });
      it('expected usage, insert', async () => {
        const data = {
          create: [
            {
              nextStepId: nextStep.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
            {
              nextStepId: nextStep.id,
              resourceId: resources[1].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
            {
              nextStepId: nextStep.id,
              resourceId: resources[2].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
            {
              nextStepId: nextStep.id,
              resourceId: resources[3].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
          ],
          update: [],
          destroy: [],
        };
        await syncResourcesForNextStep(data);
        const nsResources = await NextStepResource.findAll({
          where: {
            nextStepId: nextStep.id,
            resourceId: { [Op.in]: resources.map((r) => r.id) },
          },
          include: [
            { model: Resource, as: 'resource' },
          ],
        });
        expect(nsResources.length).toEqual(4);
      });
      it('expected usage, update', async () => {
        let data = {
          create: [
            {
              nextStepId: nextStep.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
            {
              nextStepId: nextStep.id,
              resourceId: resources[1].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
            {
              nextStepId: nextStep.id,
              resourceId: resources[2].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
            {
              nextStepId: nextStep.id,
              resourceId: resources[3].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
          ],
          update: [],
          destroy: [],
        };
        await syncResourcesForNextStep(data);
        data = {
          create: [],
          update: [
            {
              nextStepId: nextStep.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
          ],
          destroy: [],
        };
        await syncResourcesForNextStep(data);
        const nsResources = await NextStepResource.findAll({
          where: { nextStepId: nextStep.id, resourceId: resources[0].id },
          include: [
            { model: Resource, as: 'resource' },
          ],
        });
        expect(nsResources[0].dataValues.sourceFields.length).toEqual(1);
        expect(nsResources[0].isAutoDetected).toEqual(false);
      });
      it('expected usage, delete', async () => {
        let data = {
          create: [
            {
              nextStepId: nextStep.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
            {
              nextStepId: nextStep.id,
              resourceId: resources[1].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
            {
              nextStepId: nextStep.id,
              resourceId: resources[2].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
            {
              nextStepId: nextStep.id,
              resourceId: resources[3].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
          ],
          update: [],
          destroy: [],
        };
        await syncResourcesForNextStep(data);
        data = {
          create: [],
          update: [],
          destroy: [
            {
              nextStepId: nextStep.id,
              resourceIds: resources.map((r) => r.id),
            },
          ],
        };
        await syncResourcesForNextStep(data);
        const nsResources = await NextStepResource.findAll({
          where: {
            nextStepId: nextStep.id,
            resourceId: { [Op.in]: resources.map((r) => r.id) },
          },
        });
        expect(nsResources.length).toEqual(0);
      });
      it('expected usage, insert/update/delete', async () => {
        let data = {
          create: [
            {
              nextStepId: nextStep.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
            {
              nextStepId: nextStep.id,
              resourceId: resources[1].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
            {
              nextStepId: nextStep.id,
              resourceId: resources[2].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
          ],
          update: [],
          destroy: [],
        };
        await syncResourcesForNextStep(data);
        data = {
          create: [
            {
              nextStepId: nextStep.id,
              resourceId: resources[3].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
          ],
          update: [
            {
              nextStepId: nextStep.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.NEXTSTEPS.RESOURCE],
              isAutoDetected: false,
            },
          ],
          destroy: [
            {
              nextStepId: nextStep.id,
              resourceIds: [resources[1].id],
            },
          ],
        };
        await syncResourcesForNextStep(data);
        const nsResources = await NextStepResource.findAll({
          where: {
            nextStepId: nextStep.id,
            resourceId: { [Op.in]: resources.map((r) => r.id) },
          },
        });
        expect(nsResources.length).toEqual(3);
        expect(nsResources.map((r) => r.resourceId)).toContain(resources[3].id);
        expect(nsResources.map((r) => r.resourceId)).not.toContain(resources[1].id);
        expect(nsResources.find((r) => r.resourceId === resources[0].id).sourceFields.length)
          .toEqual(1);
        expect(nsResources[0].isAutoDetected).toEqual(false);
      });
    });
    describe('processNextStepForResourcesById', () => {
      let resources;
      let nextStep;
      const urls = [
        'http://google.com',
        'http://github.com',
        'http://cloud.gov',
        'https://adhocteam.us/',
      ];
      beforeAll(async () => {
        [nextStep] = await NextStep.findOrCreate({
          where: {
            activityReportId: 9999,
            note: 'Resource NextStep test. http://google.com',
            noteType: NEXTSTEP_NOTETYPE.SPECIALIST,
          },
          individualHooks: true,
          raw: true,
        });
      });
      beforeEach(async () => {
        resources = await findOrCreateResources(urls);
      });
      afterEach(async () => {
        await NextStepResource.destroy({
          where: { nextStepId: nextStep.id },
          individualHooks: true,
        });
      });
      afterAll(async () => {
        await Resource.destroy({
          where: { url: { [Op.in]: urls } },
          individualHooks: true,
        });
        await NextStep.destroy({
          where: { id: nextStep.id },
          individualHooks: true,
        });
      });
      it('expected usage, empty urls', async () => {
        const nsResources = await processNextStepForResourcesById(nextStep.id, []);
        expect(nsResources.length).toEqual(0);
      });
      it('expected usage, with urls', async () => {
        const nsResources = await processNextStepForResourcesById(
          nextStep.id,
          urls,
        );
        expect(nsResources.length).toEqual(4);
        nsResources.forEach((resource) => {
          expect(resource.dataValues.sourceFields.sort())
            .toEqual([SOURCE_FIELD.NEXTSTEPS.RESOURCE]);
        });
      });
      it('expected usage, add and remove urls', async () => {
        let nsResources = await processNextStepForResourcesById(
          nextStep.id,
          [],
        );
        expect(nsResources.length).toEqual(0);

        nsResources = await processNextStepForResourcesById(
          nextStep.id,
          [urls[0]],
        );
        expect(nsResources.length).toEqual(1);
        expect(nsResources[0].dataValues.sourceFields).toEqual([SOURCE_FIELD.NEXTSTEPS.RESOURCE]);

        nsResources = await processNextStepForResourcesById(
          nextStep.id,
          [urls[1]],
        );
        expect(nsResources.length).toEqual(1);
        expect(nsResources[0].dataValues.sourceFields).toEqual([SOURCE_FIELD.NEXTSTEPS.RESOURCE]);
        expect(nsResources[0].resource.dataValues.url).toEqual(urls[1]);

        nsResources = await processNextStepForResourcesById(
          nextStep.id,
          urls,
        );
        expect(nsResources.length).toEqual(4);
        nsResources.forEach((resource) => {
          expect(resource.dataValues.sourceFields).toEqual([SOURCE_FIELD.NEXTSTEPS.RESOURCE]);
        });

        nsResources = await processNextStepForResourcesById(
          nextStep.id,
          [],
        );
        expect(nsResources.length).toEqual(0);
      });
    });
  });
  describe('Goal Resource processing', () => {
    describe('calculateIsAutoDetectedForGoal', () => {
      let sourceFields;
      it('returns false for goal name', () => {
        sourceFields = [SOURCE_FIELD.GOAL.NAME];
        expect(calculateIsAutoDetectedForGoal(sourceFields)).toEqual(false);
      });
      it('returns false when name and resource change', () => {
        sourceFields = [SOURCE_FIELD.GOAL.NAME, SOURCE_FIELD.GOAL.RESOURCE];
        expect(calculateIsAutoDetectedForGoal(sourceFields)).toEqual(false);
      });
      it('expected usage, non-auto-detected single', () => {
        sourceFields = [SOURCE_FIELD.GOAL.RESOURCE];
        expect(calculateIsAutoDetectedForGoal(sourceFields)).toEqual(false);
      });
      // Note all fail cases handled by helper function tests for calculateIsAutoDetected
    });
    describe('syncResourcesForGoal', () => {
      let resources;
      let goal;
      const urls = [
        'http://google.com',
        'http://github.com',
        'http://cloud.gov',
        'https://adhocteam.us/',
      ];
      beforeAll(async () => {
        [goal] = await Goal.findOrCreate({
          where: {
            grantId: 315,
            name: 'Resource Goal test. http://google.com',
            status: GOAL_STATUS.NOT_STARTED,
            onAR: false,
            onApprovedAR: false,
          },
          individualHooks: true,
          raw: true,
        });
      });
      beforeEach(async () => {
        resources = await findOrCreateResources(urls);
      });
      afterEach(async () => {
        await GoalResource.destroy({
          where: {
            goalId: goal.id,
            resourceId: { [Op.in]: resources.map((r) => r.id) },
          },
          individualHooks: true,
        });
      });
      afterAll(async () => {
        await Resource.destroy({
          where: { id: { [Op.in]: resources.map((r) => r.id) } },
          individualHooks: true,
        });
        await Goal.destroy({
          where: { id: goal.id },
          individualHooks: true,
          force: true,
        });
      });
      it('expected usage, insert', async () => {
        const data = {
          create: [
            {
              goalId: goal.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
            {
              goalId: goal.id,
              resourceId: resources[1].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
            {
              goalId: goal.id,
              resourceId: resources[2].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
            {
              goalId: goal.id,
              resourceId: resources[3].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
          ],
          update: [],
          destroy: [],
        };
        await syncResourcesForGoal(data);
        const gResources = await GoalResource.findAll({
          where: {
            goalId: goal.id,
            resourceId: { [Op.in]: resources.map((r) => r.id) },
          },
          include: [
            { model: Resource, as: 'resource' },
          ],
        });
        expect(gResources.length).toEqual(4);
      });
      it('expected usage, update', async () => {
        let data = {
          create: [
            {
              goalId: goal.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
            {
              goalId: goal.id,
              resourceId: resources[1].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
            {
              goalId: goal.id,
              resourceId: resources[2].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
            {
              goalId: goal.id,
              resourceId: resources[3].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
          ],
          update: [],
          destroy: [],
        };
        await syncResourcesForGoal(data);
        data = {
          create: [],
          update: [
            {
              goalId: goal.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
          ],
          destroy: [],
        };
        await syncResourcesForGoal(data);
        const gResources = await GoalResource.findAll({
          where: { goalId: goal.id, resourceId: resources[0].id },
          include: [
            { model: Resource, as: 'resource' },
          ],
        });
        expect(gResources[0].dataValues.sourceFields.length).toEqual(1);
        expect(gResources[0].isAutoDetected).toEqual(false);
      });
      it('expected usage, delete', async () => {
        let data = {
          create: [
            {
              goalId: goal.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
            {
              goalId: goal.id,
              resourceId: resources[1].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
            {
              goalId: goal.id,
              resourceId: resources[2].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
            {
              goalId: goal.id,
              resourceId: resources[3].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
          ],
          update: [],
          destroy: [],
        };
        await syncResourcesForGoal(data);
        data = {
          create: [],
          update: [],
          destroy: [
            {
              goalId: goal.id,
              resourceIds: resources.map((r) => r.id),
            },
          ],
        };
        await syncResourcesForGoal(data);
        const gResources = await GoalResource.findAll({
          where: {
            goalId: goal.id,
            resourceId: { [Op.in]: resources.map((r) => r.id) },
          },
        });
        expect(gResources.length).toEqual(0);
      });
      it('expected usage, insert/update/delete', async () => {
        let data = {
          create: [
            {
              goalId: goal.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
            {
              goalId: goal.id,
              resourceId: resources[1].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
            {
              goalId: goal.id,
              resourceId: resources[2].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
          ],
          update: [],
          destroy: [],
        };
        await syncResourcesForGoal(data);
        data = {
          create: [
            {
              goalId: goal.id,
              resourceId: resources[3].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
          ],
          update: [
            {
              goalId: goal.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.GOAL.RESOURCE],
              isAutoDetected: false,
            },
          ],
          destroy: [
            {
              goalId: goal.id,
              resourceIds: [resources[1].id],
            },
          ],
        };
        await syncResourcesForGoal(data);
        const gResources = await GoalResource.findAll({
          where: {
            goalId: goal.id,
            resourceId: { [Op.in]: resources.map((r) => r.id) },
          },
        });
        expect(gResources.length).toEqual(3);
        expect(gResources.map((r) => r.resourceId)).toContain(resources[3].id);
        expect(gResources.map((r) => r.resourceId)).not.toContain(resources[1].id);
        expect(gResources.find((r) => r.resourceId === resources[0].id).sourceFields.length)
          .toEqual(1);
        expect(gResources.find((r) => r.resourceId === resources[0].id).isAutoDetected)
          .toEqual(false);
      });
    });
    describe('processGoalForResourcesById', () => {
      let resources;
      let goal;
      const urls = [
        'http://google.com',
        'http://github.com',
        'http://cloud.gov',
        'https://adhocteam.us/',
      ];
      beforeAll(async () => {
        [goal] = await Goal.findOrCreate({
          where: {
            grantId: 315,
            name: 'Resource Goal test. http://google.com',
            status: GOAL_STATUS.NOT_STARTED,
            onAR: false,
            onApprovedAR: false,
          },
          individualHooks: true,
          raw: true,
        });
      });
      beforeEach(async () => {
        resources = await findOrCreateResources(urls);
      });
      afterEach(async () => {
        await GoalResource.destroy({
          where: { goalId: goal.id },
          individualHooks: true,
        });
      });
      afterAll(async () => {
        await Resource.destroy({
          where: { url: { [Op.in]: urls } },
          individualHooks: true,
        });
        await Goal.destroy({
          where: { id: goal.id },
          individualHooks: true,
          force: true,
        });
      });
      it('expected usage, empty urls', async () => {
        const gResources = await processGoalForResourcesById(goal.id, []);
        expect(gResources.length).toEqual(0);
      });
      it('expected usage, with urls', async () => {
        const gResources = await processGoalForResourcesById(
          goal.id,
          urls,
        );
        expect(gResources.length).toEqual(4);
        gResources.forEach((resource) => {
          expect(resource.dataValues.sourceFields).toEqual([SOURCE_FIELD.GOAL.RESOURCE]);
        });
      });
      it('expected usage, add and remove urls', async () => {
        let gResources = await processGoalForResourcesById(
          goal.id,
          [],
        );
        expect(gResources.length).toEqual(0);
        gResources = await processGoalForResourcesById(
          goal.id,
          [urls[0]],
        );
        expect(gResources.length).toEqual(1);
        expect(gResources[0].dataValues.sourceFields).toEqual([SOURCE_FIELD.GOAL.RESOURCE]);

        gResources = await processGoalForResourcesById(
          goal.id,
          [urls[1]],
        );
        expect(gResources.length).toEqual(1);
        expect(gResources[0].resource.dataValues.url).toEqual(urls[1]);
        expect(gResources[0].dataValues.sourceFields).toEqual([SOURCE_FIELD.GOAL.RESOURCE]);

        gResources = await processGoalForResourcesById(
          goal.id,
          urls,
        );
        expect(gResources.length).toEqual(4);
        gResources.forEach((resource) => {
          expect(resource.dataValues.sourceFields).toEqual([SOURCE_FIELD.GOAL.RESOURCE]);
        });

        gResources = await processGoalForResourcesById(
          goal.id,
          [],
        );
        expect(gResources.length).toEqual(0);
      });
    });
  });
  describe('ActivityReportObjective Resource Processing', () => {
    describe('calculateIsAutoDetectedForActivityReportObjective', () => {
      let sourceFields;
      it('returns false when only title changes', () => {
        sourceFields = [SOURCE_FIELD.REPORTOBJECTIVE.TITLE];
        expect(calculateIsAutoDetectedForActivityReportObjective(sourceFields)).toEqual(false);
      });
      it('returns false when title and tta provided change', () => {
        sourceFields = [
          SOURCE_FIELD.REPORTOBJECTIVE.TITLE,
          SOURCE_FIELD.REPORTOBJECTIVE.TTAPROVIDED,
        ];
        expect(calculateIsAutoDetectedForActivityReportObjective(sourceFields)).toEqual(false);
      });
      it('returns false when title and resource change', () => {
        sourceFields = [SOURCE_FIELD.REPORTOBJECTIVE.TITLE, SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE];
        expect(calculateIsAutoDetectedForActivityReportObjective(sourceFields)).toEqual(false);
      });
      it('expected usage, non-auto-detected single', () => {
        sourceFields = [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE];
        expect(calculateIsAutoDetectedForActivityReportObjective(sourceFields)).toEqual(false);
      });
      // Note all fail cases handled by helper function tests for calculateIsAutoDetected
    });
    describe('syncResourcesForActivityReportObjective', () => {
      let resources;
      let goal;
      let objective;
      let reportObjective;
      const urls = [
        'http://google.com',
        'http://github.com',
        'http://cloud.gov',
        'https://adhocteam.us/',
      ];
      beforeAll(async () => {
        [goal] = await Goal.findOrCreate({
          where: {
            grantId: 315,
            name: 'Resource Goal test. http://google.com',
            status: GOAL_STATUS.NOT_STARTED,
            onAR: false,
            onApprovedAR: false,
          },
          individualHooks: true,
        });
        [objective] = await Objective.findOrCreate({
          where: {
            goalId: goal.id,
            title: 'Resource Objective test. http://google.com',
            status: OBJECTIVE_STATUS.NOT_STARTED,
            onAR: false,
            onApprovedAR: false,
          },
          individualHooks: true,
          raw: true,
        });
        [reportObjective] = await ActivityReportObjective.findOrCreate({
          where: {
            activityReportId: 9999,
            objectiveId: objective.id,
            title: 'Resource Objective test. http://google.com',
            ttaProvided: 'Resource Objective test. http://google.com',
            status: OBJECTIVE_STATUS.NOT_STARTED,
          },
          individualHooks: true,
          raw: true,
        });
      });
      beforeEach(async () => {
        resources = await findOrCreateResources(urls);
      });
      afterEach(async () => {
        await ActivityReportObjectiveResource.destroy({
          where: {
            activityReportObjectiveId: reportObjective.id,
            resourceId: { [Op.in]: resources.map((r) => r.id) },
          },
          individualHooks: true,
        });
      });
      afterAll(async () => {
        await Resource.destroy({
          where: { id: { [Op.in]: resources.map((r) => r.id) } },
          individualHooks: true,
        });
        await ActivityReportObjective.destroy({
          where: { id: reportObjective.id },
          individualHooks: true,
        });
        await Objective.destroy({
          where: { id: objective.id },
          individualHooks: true,
          force: true,
        });
      });
      it('expected usage, insert', async () => {
        const data = {
          create: [
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[1].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[2].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[3].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
          ],
          update: [],
          destroy: [],
        };
        await syncResourcesForActivityReportObjective(data);
        const oResources = await ActivityReportObjectiveResource.findAll({
          where: {
            activityReportObjectiveId: reportObjective.id,
            resourceId: { [Op.in]: resources.map((r) => r.id) },
          },
          include: [
            { model: Resource, as: 'resource' },
          ],
        });
        expect(oResources.length).toEqual(4);
      });
      it('expected usage, update', async () => {
        let data = {
          create: [
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[1].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[2].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[3].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
          ],
          update: [],
          destroy: [],
        };
        await syncResourcesForActivityReportObjective(data);
        data = {
          create: [],
          update: [
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
          ],
          destroy: [],
        };
        await syncResourcesForActivityReportObjective(data);
        const oResources = await ActivityReportObjectiveResource.findAll({
          where: { activityReportObjectiveId: reportObjective.id, resourceId: resources[0].id },
          include: [
            { model: Resource, as: 'resource' },
          ],
        });
        expect(oResources[0].dataValues.sourceFields.length).toEqual(1);
        expect(oResources[0].isAutoDetected).toEqual(false);
      });
      it('expected usage, delete', async () => {
        let data = {
          create: [
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[1].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[2].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[3].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
          ],
          update: [],
          destroy: [],
        };
        await syncResourcesForActivityReportObjective(data);
        data = {
          create: [],
          update: [],
          destroy: [
            {
              activityReportObjectiveId: reportObjective.id,
              resourceIds: resources.map((r) => r.id),
            },
          ],
        };
        await syncResourcesForActivityReportObjective(data);
        const oResources = await ActivityReportObjectiveResource.findAll({
          where: {
            activityReportObjectiveId: reportObjective.id,
            resourceId: { [Op.in]: resources.map((r) => r.id) },
          },
        });
        expect(oResources.length).toEqual(0);
      });
      it('expected usage, insert/update/delete', async () => {
        let data = {
          create: [
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[1].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[2].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
          ],
          update: [],
          destroy: [],
        };
        await syncResourcesForActivityReportObjective(data);
        data = {
          create: [
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[3].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
          ],
          update: [
            {
              activityReportObjectiveId: reportObjective.id,
              resourceId: resources[0].id,
              sourceFields: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE],
              isAutoDetected: false,
            },
          ],
          destroy: [
            {
              activityReportObjectiveId: reportObjective.id,
              resourceIds: [resources[1].id],
            },
          ],
        };
        await syncResourcesForActivityReportObjective(data);
        const oResources = await ActivityReportObjectiveResource.findAll({
          where: {
            activityReportObjectiveId: reportObjective.id,
            resourceId: { [Op.in]: resources.map((r) => r.id) },
          },
        });
        expect(oResources.length).toEqual(3);
        expect(oResources.map((r) => r.resourceId)).toContain(resources[3].id);
        expect(oResources.map((r) => r.resourceId)).not.toContain(resources[1].id);
        expect(oResources.find((r) => r.resourceId === resources[0].id).sourceFields.length)
          .toEqual(1);
        expect(oResources.find((r) => r.resourceId === resources[0].id).isAutoDetected)
          .toEqual(false);
      });
    });
    describe('processActivityReportObjectiveForResourcesById', () => {
      let resources;
      let goal;
      let objective;
      let reportObjective;
      const urls = [
        'http://google.com',
        'http://github.com',
        'http://cloud.gov',
        'https://adhocteam.us/',
      ];
      beforeAll(async () => {
        [goal] = await Goal.findOrCreate({
          where: {
            grantId: 315,
            name: 'Resource Goal test. http://google.com',
            status: GOAL_STATUS.NOT_STARTED,
            onAR: false,
            onApprovedAR: false,
          },
          individualHooks: true,
        });
        [objective] = await Objective.findOrCreate({
          where: {
            goalId: goal.id,
            title: 'Resource Objective test. http://google.com',
            status: OBJECTIVE_STATUS.NOT_STARTED,
            onAR: false,
            onApprovedAR: false,
          },
          individualHooks: true,
          raw: true,
        });
        [reportObjective] = await ActivityReportObjective.findOrCreate({
          where: {
            activityReportId: 9999,
            objectiveId: objective.id,
            title: 'Resource Objective test. http://google.com',
            ttaProvided: 'Resource Objective test. http://google.com',
            status: OBJECTIVE_STATUS.NOT_STARTED,
          },
          individualHooks: true,
          raw: true,
        });
      });
      beforeEach(async () => {
        resources = await findOrCreateResources(urls);
      });
      afterEach(async () => {
        await ActivityReportObjectiveResource.destroy({
          where: { activityReportObjectiveId: reportObjective.id },
          individualHooks: true,
        });
      });
      afterAll(async () => {
        await Resource.destroy({
          where: { url: { [Op.in]: urls } },
          individualHooks: true,
        });
        await ActivityReportObjective.destroy({
          where: { id: reportObjective.id },
          individualHooks: true,
        });
        await Objective.destroy({
          where: { id: objective.id },
          individualHooks: true,
          force: true,
        });
      });
      it('expected usage, empty urls', async () => {
        const oResources = await processActivityReportObjectiveForResourcesById(
          reportObjective.id,
          [],
        );
        expect(oResources.length).toEqual(0);
      });
      it('expected usage, with urls', async () => {
        const oResources = await processActivityReportObjectiveForResourcesById(
          reportObjective.id,
          urls,
        );
        expect(oResources.length).toEqual(4);
        oResources.forEach((resource) => {
          expect(resource.dataValues.sourceFields).toEqual([SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE]);
        });
      });
      it('expected usage, add and remove urls', async () => {
        let oResources = await processActivityReportObjectiveForResourcesById(
          reportObjective.id,
          [],
        );
        expect(oResources.length).toEqual(0);

        oResources = await processActivityReportObjectiveForResourcesById(
          reportObjective.id,
          [urls[0]],
        );
        expect(oResources.length).toEqual(1);
        expect(oResources[0].dataValues.sourceFields).toEqual([
          SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE,
        ]);

        oResources = await processActivityReportObjectiveForResourcesById(
          reportObjective.id,
          [urls[1]],
        );
        expect(oResources.length).toEqual(1);
        expect(oResources[0].resource.dataValues.url).toEqual(urls[1]);
        expect(oResources[0].dataValues.sourceFields).toEqual([
          SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE,
        ]);

        oResources = await processActivityReportObjectiveForResourcesById(
          reportObjective.id,
          urls,
        );
        expect(oResources.length).toEqual(4);
        oResources.forEach((resource) => {
          expect(resource.dataValues.sourceFields).toEqual([SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE]);
        });

        oResources = await processActivityReportObjectiveForResourcesById(
          reportObjective.id,
          [],
        );
        expect(oResources.length).toEqual(0);
      });
    });
  });
});
