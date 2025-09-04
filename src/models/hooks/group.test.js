import { afterCreate, afterUpdate } from './group';
import { GROUP_COLLABORATORS } from '../../constants';
import { currentUserPopulateCollaboratorForType } from '../helpers/genericCollaborator';
import { skipIf } from '../helpers/flowControl';

jest.mock('../helpers/genericCollaborator', () => ({
  currentUserPopulateCollaboratorForType: jest.fn(),
}));

jest.mock('../helpers/flowControl', () => ({
  skipIf: jest.fn(),
}));

describe('group hooks', () => {
  const mockSequelize = {};
  const mockInstance = { id: 1 };
  const mockOptions = { transaction: {} };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('afterCreate', () => {
    it('calls currentUserPopulateCollaboratorForType for creator and editor', async () => {
      skipIf.mockReturnValue(false);
      await afterCreate(mockSequelize, mockInstance, mockOptions);

      expect(skipIf).toHaveBeenCalledWith(mockOptions, 'autoPopulateCreator');
      expect(currentUserPopulateCollaboratorForType).toHaveBeenCalledTimes(2);
      expect(currentUserPopulateCollaboratorForType).toHaveBeenCalledWith(
        'group',
        mockSequelize,
        mockOptions.transaction,
        mockInstance.id,
        GROUP_COLLABORATORS.CREATOR,
      );
      expect(currentUserPopulateCollaboratorForType).toHaveBeenCalledWith(
        'group',
        mockSequelize,
        mockOptions.transaction,
        mockInstance.id,
        GROUP_COLLABORATORS.EDITOR,
      );
    });

    it('skips creator population if skipIf returns true', async () => {
      skipIf.mockReturnValue(true);
      await afterCreate(mockSequelize, mockInstance, mockOptions);

      expect(skipIf).toHaveBeenCalledWith(mockOptions, 'autoPopulateCreator');
      expect(currentUserPopulateCollaboratorForType).toHaveBeenCalledTimes(1);
      expect(currentUserPopulateCollaboratorForType).not.toHaveBeenCalledWith(
        'group',
        mockSequelize,
        mockOptions.transaction,
        mockInstance.id,
        GROUP_COLLABORATORS.CREATOR,
      );
      expect(currentUserPopulateCollaboratorForType).toHaveBeenCalledWith(
        'group',
        mockSequelize,
        mockOptions.transaction,
        mockInstance.id,
        GROUP_COLLABORATORS.EDITOR,
      );
    });
  });

  describe('afterUpdate', () => {
    it('calls currentUserPopulateCollaboratorForType for editor', async () => {
      await afterUpdate(mockSequelize, mockInstance, mockOptions);

      expect(currentUserPopulateCollaboratorForType).toHaveBeenCalledTimes(1);
      expect(currentUserPopulateCollaboratorForType).toHaveBeenCalledWith(
        'group',
        mockSequelize,
        mockOptions.transaction,
        mockInstance.id,
        GROUP_COLLABORATORS.EDITOR,
      );
      expect(skipIf).not.toHaveBeenCalled();
    });
  });
});
