import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  Fieldset, TextInput, Button,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import ContextMenu from '../../../components/ContextMenu';
import FormItem from '../../../components/FormItem';
import ReviewPage from './Review/ReviewPage';

const NoteEntry = ({
  onEntry, onCancel, name, isRequired = false, defaultValue = '',
}) => {
  const [input, updateInput] = useState(defaultValue);

  const onSubmit = () => {
    updateInput('');
    onEntry(input.trim());
  };

  const onUpdate = (e) => {
    e.preventDefault();
    updateInput(e.target.value);
  };

  return (
    <FormItem
      required={isRequired}
      name={name}
      label="What have you agreed to do next?"
    >
      <TextInput name={name} onChange={onUpdate} data-testid={`${name}-input`} defaultValue={input} />
      <Button outline disabled={!(input && input.trim())} onClick={onSubmit} data-testid={`${name}-button`} type="button">Save Next Step</Button>
      {!isRequired && <Button secondary onClick={onCancel} type="button" data-testid={`${name}-cancel-button`}>Cancel</Button>}
    </FormItem>
  );
};

NoteEntry.propTypes = {
  onEntry: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  defaultValue: PropTypes.string,
  isRequired: PropTypes.bool,
};

NoteEntry.defaultProps = {
  isRequired: false,
  defaultValue: '',
};

const NoteEntries = ({ name, humanName }) => {
  const {
    register, control, setValue, trigger,
  } = useFormContext();
  const notes = useWatch({ name, control });

  const [showPrompt, updateShowPrompt] = useState(false);
  const [targetIndex, updateTargetIndex] = useState(-1);

  useEffect(() => {
    register({ name }, { validate: (allNotes) => (allNotes.length !== 0 ? true : `${humanName} requires at least one step`) });
  });

  const onEntry = (note, index, noteId) => {
    const newNotes = [...notes];
    newNotes[index] = { note, id: noteId };
    setValue(name, newNotes);
    updateShowPrompt(false);
    trigger(name);
  };

  const onEdit = (index) => {
    updateShowPrompt(true);
    updateTargetIndex(index);
    trigger(name);
  };

  const onDelete = (index) => {
    const newNotes = notes.filter((item, itemIndex) => itemIndex !== index);
    setValue(name, newNotes);
    updateShowPrompt(false);
    trigger(name);
  };

  const onCancel = () => {
    updateShowPrompt(false);
  };

  if (notes.length === 0) {
    return (
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend={`${humanName} Next Steps`}>
        <NoteEntry
          onEntry={(value) => onEntry(value, 0)}
          isRequired
          name={name}
          onCancel={onCancel}
          humanName={humanName}
        />
      </Fieldset>
    );
  }

  const targetId = notes[targetIndex] ? notes[targetIndex].id : undefined;
  const defaultValue = notes[targetIndex] ? notes[targetIndex].note : undefined;

  return (
    <>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend={`${humanName} Next Steps`}>
        <ul className="usa-list--unstyled">
          {notes.map((item, index) => (
            <li key={item.note} className="grid-row flex-row border-bottom padding-top-2 padding-bottom-2" style={{ borderColor: '#f0f0f0' }}>
              <div className="grid-col flex-12">
                {item.note}
              </div>

              <div className="grid-col" style={{ marginTop: '0px' }}>
                <ContextMenu
                  label="Menu"
                  menuItems={
                    [
                      { label: 'Edit', onClick: (e) => { e.preventDefault(); onEdit(index); } },
                      { label: 'Delete', onClick: (e) => { e.preventDefault(); onDelete(index); } },
                    ]
                  }
                />
              </div>
            </li>
          ))}
        </ul>

        {showPrompt ? (
          <div className="border-left-05 border-blue padding-left-2 margin-top-2 smart-hub-border-blue-primary">
            <NoteEntry
              onEntry={(value) => onEntry(value, targetIndex, targetId)}
              isRequired={false}
              onCancel={onCancel}
              name={name}
              humanName={humanName}
              defaultValue={defaultValue}
            />
          </div>
        )
          : (
            <Button unstyled onClick={() => onEdit(notes.length)}>
              <FontAwesomeIcon icon={faPlusCircle} />
              <span className="padding-left-05">Add New Follow Up</span>
            </Button>
          )}

      </Fieldset>
    </>
  );
};

NoteEntries.propTypes = {
  name: PropTypes.string.isRequired,
  humanName: PropTypes.string.isRequired,
};

const NextSteps = () => (
  <>
    <Helmet>
      <title>Next steps</title>
    </Helmet>

    <div className="padding-bottom-205">
      <NoteEntries name="specialistNextSteps" humanName="Specialist" />
    </div>

    <NoteEntries name="granteeNextSteps" humanName="Grantees" />

  </>
);

const sections = [
  {
    title: 'Specialist next steps',
    anchor: 'specialist-next-steps',
    items: [
      { label: 'What have you agreed to do next?', name: 'specialistNextSteps', path: 'note' },
    ],
  },
  {
    title: 'Grantee next steps',
    anchor: 'grantee-next-steps',
    items: [
      { label: 'What have you agreed to do next?', name: 'granteeNextSteps', path: 'note' },
    ],
  },
];

const ReviewSection = () => (
  <ReviewPage sections={sections} path="next-steps" />
);

export default {
  position: 4,
  label: 'Next steps',
  path: 'next-steps',
  review: false,
  reviewSection: () => <ReviewSection />,
  render: () => (
    <NextSteps />
  ),
};
