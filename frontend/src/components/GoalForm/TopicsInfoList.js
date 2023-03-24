import React from 'react';
import { Alert } from '@trussworks/react-uswds';
import './TopicsInfoLIst.scss';

const topicInfo = [
  {
    title: 'Behavioral / Mental Health / Trauma',
    info: 'Child behavior, child or family mental health/trauma.',
    infoAlert: null,
  },
  {
    title: 'Child Screening and Assessment',
    info: 'Ongoing child assessment, screening, and its use by the recipient.',
    infoAlert: null,
  },
  {
    title: 'CLASS: Classroom Organization',
    info: 'Teaching practices commonly assessed in this domain as defined by Teachstone or CLASS training.',
    infoAlert: null,
  },
  {
    title: 'CLASS: Emotional Support',
    info: 'Teaching practices commonly assessed in this domain as defined by Teachstone or CLASS training.',
    infoAlert: null,
  },
  {
    title: 'CLASS: Instructional Support',
    info: 'Teaching practices commonly assessed in this domain as defined by Teachstone or CLASS training.',
    infoAlert: null,
  },
  {
    title: 'Coaching',
    info: 'Developing and implementing coaching systems or coaching practices.',
    infoAlert: null,
  },
  {
    title: 'Communication',
    info: 'Systems and practices that support recipients in communicating effectively with internal and external stakeholders.',
    infoAlert: null,
  },
  {
    title: 'Community and Self-Assessment',
    info: 'Systems and practices that support recipients in providing the right services to the right population, and assessment of continuous quality improvement efforts.',
    infoAlert: null,
  },
  {
    title: 'Culture & Language',
    info: 'Incorporating the culture and language of the populations served by the recipient.',
    infoAlert: null,
  },
  {
    title: 'Curriculum (Instructional or Parenting',
    info: 'Implementing curriculum with fidelity.',
    infoAlert: null,
  },
  {
    title: 'Data and Evaluation',
    info: 'Qualitative and quantitative measures that ensure effective recipient management in all service areas. This can include supporting the recipient with planning for, collecting, using, analyzing, or sharing recipient data on any topic within the specialist\'s scope of work.',
    infoAlert: null,
  },
  {
    title: 'Disabilities Services',
    info: 'Children with disabilities, their care, education, development, families, and coordination with Part B and Part C.',
    infoAlert: null,
  },
  {
    title: 'Environmental Health and Safety / EPRR',
    info: 'Environmental health issues: asthma, chemical hazards, drinking water, indoor air quality, mold, pesticides, lead, radon, cleaning, sanitizing, etc.',
    infoAlert: null,
  },
  {
    title: 'Equity',
    info: 'Select when:\n(1) TTA was provided on the topic of equity and/or\n(2) TTA was provided on another topic and intentionally addressed equity.',
    infoAlert: 'In the case of (2), select both the topic box and the equity box. See Equity Topic Guidance for more information.',
  },
  {
    title: 'ERSEA',
    info: 'Eligibility, Recruitment, Selection, Enrollment, Attendance. Includes work on Full Enrollment initiative.',
    infoAlert: null,
  },
  {
    title: 'Facilities',
    info: 'Renovation, purchasing, maintenance, and repair of classrooms, outdoor learning environments, and offices.',
    infoAlert: null,
  },
  {
    title: 'Family Support Services',
    info: 'Any recipient services designed to support PFCE Framework Outcome: Family Wellbeing.',
    infoAlert: null,
  },
  {
    title: 'Fiscal / Budget',
    info: 'Fiscal management system including use of federal assets, complying with regulations, internal controls, and helping recipient leaders collaborate as they develop budgets and address goals and priorities.',
    infoAlert: null,
  },
];

export default function TopicsInfoList() {
  return (
    <>
      {
     topicInfo.map((t) => (
       <>
         <span className="smart-hub-topics-info-header margin-bottom-0">{t.title}</span>
         <p className="smart-hub-topics-info-text margin-top-0" style={{ whiteSpace: 'break-spaces' }}>
           {t.info}
         </p>
         {
            t.infoAlert
              ? (
                <Alert className="smart-hub-topics-info-text margin-bottom-2" type="info" headingLevel="h4" slim>
                  {t.infoAlert}
                </Alert>
              )
              : null
         }
       </>
     ))
    }
    </>
  );
}
