/* eslint-disable import/prefer-default-export */

interface GoalTemplate {
  id: number;
  label: string;
  value: number;
  name: string;
  goalIds: number[];
  isRttapa: string;
  status: string;
  endDate: string | null;
  grantIds: [];
  oldGrantIds: [];
  onApprovedAR: true;
  isNew: false;
}

export async function getCuratedTemplates(): Promise<GoalTemplate[]> {
  return [
    {
      id: 1,
      label: 'Goal Template 1',
      value: 1,
      name: 'Goal Template 1',
      goalIds: [1],
      isRttapa: '',
      status: 'Draft',
      endDate: null,
      grantIds: [],
      oldGrantIds: [],
      onApprovedAR: true,
      isNew: false,
    },
  ];
}
