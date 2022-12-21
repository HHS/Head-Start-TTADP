import { Op } from 'sequelize';
import db, {
  User,
  Recipient,
  Grant,
  Goal,
  File,
  Role,
  Objective,
  ObjectiveFile,
  ObjectiveResource,
  ObjectiveTopic,
  ActivityReport,
  ActivityRecipient,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveTopic,
  CollaboratorRole,
  Topic,
} from '../models';
import {
  // Resource Table
  findOrCreateResource,
  findOrCreateResources,
  // Helper functions
  calculateIsAutoDetected,
  collectURLsFromField,
  resourcesFromField,
  mergeRecordsByUrlAndGenericId,
  transformRecordByURLToResource,
  filterResourcesForSync,
  // ActivityReports Resource Processing
  calculateIsAutoDetectedForActivityReports,
  syncResourcesForActivityReport,
  activityReportIdToGeneric,
  genericToActivityReportId,
  processActivityReportForResources,
  processActivityReportForResourcesById,
  // NextSteps Resource Processing
  calculateIsAutoDetectedForNextSteps,
  nextStepIdToGeneric,
  genericToNextStepId,
  syncResourcesForNextSteps,
  processNextStepsForResources,
  processNextStepsForResourcesById,
  // Objective Resource processing
  calculateIsAutoDetectedForObjectives,
  objectiveIdToGeneric,
  genericToObjectiveId,
  syncResourcesForObjectives,
  processObjectivesForResources,
  processObjectivesForResourcesById,
  // ActivityReportObjective Resource Processing
  calculateIsAutoDetectedForActivityReportObjectives,
  activityReportObjectiveIdToGeneric,
  genericToActivityReportObjectiveId,
  syncResourcesForActivityReportObjectives,
  processActivityReportObjectivesForResources,
  processActivityReportObjectivesForResourcesById,
} from './resource';
import { REPORT_STATUSES } from '../constants';

describe('resource', () => {
  describe('Resource Table', () => {
    describe('findOrCreateResource', () => {
    });
    describe('findOrCreateResources', () => {
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
        sourceFields = 'a';
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
        autoDetectedFields = 'a';
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(false);
      });
      it('fail with object autoDetectedFields', () => {
        autoDetectedFields = {};
        expect(calculateIsAutoDetected(sourceFields, autoDetectedFields)).toBe(false);
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
        ftp://foo.bar/baz
        http://foo.bar/?q=Test%20URL-encoded%20stuff
        http://1337.net
        http://223.255.255.254
        https://foo_bar.example.com/
        `;
        expect(collectURLsFromField(field).length).toEqual(26);
      });
      it('bulk non-match', () => {
        field = `
        http://✪df.ws/123
        http://➡.ws/䨹
        http://⌘.ws
        http://⌘.ws/
        http://☺.damowmow.com/
        http://مثال.إختبار
        http://例子.测试
        http://उदाहरण.परीक्षा
        http://-.~_!$&'()*+,;=:%40:80%2f::::::@example.com
        http://a.b-c.de
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
        http://-error-.invalid/
        http://a.b--c.de/
        http://-a.b.co
        http://a.b-.co
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
          calculateIsAutoDetectedFunc,
        ))
          .toMatchObject({
            create: [{
              genericId: 1,
              sourceFields: ['a'],
              resourceId: 1,
              isAutoDetected: false,
            }],
            update: [
              {
                genericId: 1,
                sourceFields: ['b', 'c'],
                resourceId: 2,
                isAutoDetected: true,
              }, // expand
              {
                genericId: 1,
                sourceFields: ['d'],
                resourceId: 3,
                isAutoDetected: true,
              }, // delta
              {
                genericId: 1,
                sourceFields: ['f'],
                resourceId: 4,
                isAutoDetected: false,
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
          calculateIsAutoDetectedFunc,
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
          calculateIsAutoDetectedFunc,
        ))
          .toMatchObject({
            create: [
              {
                genericId: 1,
                sourceFields: ['a'],
                resourceId: 1,
                isAutoDetected: false,
              },
              {
                genericId: 1,
                sourceFields: ['b', 'c'],
                resourceId: 2,
                isAutoDetected: true,
              },
              {
                genericId: 1,
                sourceFields: ['d'],
                resourceId: 3,
                isAutoDetected: true,
              },
              {
                genericId: 1,
                sourceFields: ['f'],
                resourceId: 4,
                isAutoDetected: false,
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
          calculateIsAutoDetectedFunc,
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
          calculateIsAutoDetectedFunc,
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
          calculateIsAutoDetectedFunc,
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
          calculateIsAutoDetectedFunc,
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
          calculateIsAutoDetectedFunc,
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
          calculateIsAutoDetectedFunc,
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
          calculateIsAutoDetectedFunc,
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
          calculateIsAutoDetectedFunc,
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
  });
  describe('NextSteps Resource Processing', () => {
  });
  describe('Objective Resource processing', () => {
  });
  describe('ActivityReportObjective Resource Processing', () => {
  });
});
