const { autoPopulateCreator, autoPopulateEditor } = require('./group');
const { GROUP_COLLABORATORS } = require('../constants');
const { currentUserPopulateCollaboratorForType } = require('../models/helpers/genericCollaborator');

jest.mock('../models/helpers/genericCollaborator', () => ({
  currentUserPopulateCollaboratorForType: jest.fn(),
}));

describe('group hooks', () => {
  describe('autoPopulateCreator', () => {
    afterAll(() => {
      jest.clearAllMocks();
      jest.resetModules();
    });

    it('should skip auto-population if "autoPopulateCreator" option is set', async () => {
      const sequelize = {}; // mock sequelize object
      const instance = {}; // mock instance object
      const options = { autoPopulateCreator: true }; // set "autoPopulateCreator" option to true

      const result = await autoPopulateCreator(sequelize, instance, options);

      expect(result).toBeUndefined();
    });

    it('should populate the creator collaborator for the group', async () => {
      const sequelize = {}; // mock sequelize object
      const instance = { id: 1 }; // mock instance object with an id
      const options = {}; // empty options object

      const result = await autoPopulateCreator(sequelize, instance, options);

      expect(currentUserPopulateCollaboratorForType).toHaveBeenCalledWith(
        'group',
        sequelize,
        undefined, // mock transaction
        instance.id,
        GROUP_COLLABORATORS.CREATOR,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('autoPpopulateEditor', () => {
    afterAll(() => {
      jest.clearAllMocks();
      jest.resetModules();
    });

    it('should populate the editor collaborator for the group', async () => {
      const sequelize = {}; // mock sequelize object
      const instance = { id: 1 }; // mock instance object with an id
      const options = {}; // empty options object

      const result = await autoPopulateEditor(sequelize, instance, options);

      expect(currentUserPopulateCollaboratorForType).toHaveBeenCalledWith(
        'group',
        sequelize,
        undefined, // mock transaction
        instance.id,
        GROUP_COLLABORATORS.EDITOR,
      );
      expect(result).toBeUndefined();
    });
  });
});
