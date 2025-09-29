import React from 'react';
import { Helmet } from 'react-helmet';
import { useFormContext } from 'react-hook-form';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';
import ReviewPage from '../../ActivityReport/Pages/Review/ReviewPage';
import { COLLAB_REPORT_DATA } from '../../../Constants';

const path = 'supporting-information';
const position = 2;

const SupportingInformation = () => (
  <>
    <Helmet>
      <title>Supporting information</title>
    </Helmet>
  </>
);

const ReviewSection = () => {
  const { watch } = useFormContext();
  const {
    reportGoals,
    dataUsed,
  } = watch();

  const goals = (reportGoals || []).filter(Boolean).map((goal) => goal?.goalTemplate?.standard || '').filter(Boolean).join(', ');
  const data = (dataUsed || []).filter(Boolean).map((item) => {
    if (!item) return '';
    const { collabReportDatum, collabReportDataOther } = item;
    if (collabReportDatum === 'other') {
      return collabReportDataOther;
    }

    return COLLAB_REPORT_DATA[collabReportDatum] || '';
  }).join(', ');

  const sections = [
    {
      anchor: 'support-information',
      items: [
        { label: 'Participants', name: 'participants', customValue: { participants: '' } },
        { label: 'Data collected/shared', name: 'data', customValue: { data } },
        { label: 'Supporting goals', name: 'goals', customValue: { goals } },
      ],
    },
  ];

  return <ReviewPage sections={sections} path={path} isCustomValue />;
};

export const isPageComplete = () => true;

export default {
  position,
  label: 'Supporting information',
  path,
  reviewSection: () => <ReviewSection />,
  review: false,
  render: (
    _additionalData,
    _formData,
    _reportId,
    isAppLoading,
    onContinue,
    onSaveDraft,
    onUpdatePage,
    _weAreAutoSaving,
    _datePickerKey,
    _onFormSubmit,
    Alert,
  ) => (
    <>
      <SupportingInformation />
      <Alert />
      <NavigatorButtons
        isAppLoading={isAppLoading}
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        path={path}
        position={position}
        onUpdatePage={onUpdatePage}
      />
    </>
  ),
  isPageComplete,
};
