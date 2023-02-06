import { calculateGoalsAndObjectives } from '../components/ApprovedReportV1';

describe('calculateGoalsAndObjectives', () => {
  it('should return an array of two arrays, each of which contains strings', () => {
    const report = {
      goalsAndObjectives: [],
      objectivesWithoutGoals: [
        {
          id: 1234,
          otherEntityId: 10,
          goalId: null,
          title: 'Participants will  - understand the requirements of the community assessment through exploring the recommended methods for conducting, composing, and updating the document  - recognize the significance of the community assessment as a planning tool and identify strategies and resources intended to support immediate and future ERSEA services - examine the elements of effective outreach and recruitment - identify strategies for supporting grantees with recruitment to achieve and maintaining full enrollment',
          status: 'Complete',
          objectiveTemplateId: 730,
          onAR: true,
          onApprovedAR: true,
          rtrOrder: 1,
          topics: [],
          resources: [],
          files: [],
          value: 17762,
          ids: [
            17762,
          ],
          ttaProvided: '<p><span style="font-size: 12pt;font-family: Times New Roman;">Grantee Specialists facilitated the Community Assessment and Recruitment – Looking At &amp; Beyond the Foundation Module Training. The dialogue was framed around program planning</span><br><span style="font-size: 12pt;font-family: Times New Roman;">with unknown challenges. Key elements of training include: </span></p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- a pandemic outlook </span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- community assessment regulations, new pandemic resources/materials, community changes/trials, data analysis/collection/response systems </span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- ERSEA regulations </span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- recruitment regulation, formal system, covering the full-service area, detecting new &amp; existing partnerships, not limiting recruitment, strategies for recruitment, social media, marketing in HS, communication, and specific efforts to actively locate/recruit children with disabilities and other vulnerable</span><br><span style="font-size: 12pt;font-family: Times New Roman;">children, including homeless children and children in foster care.</span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- Enrollment 1302.15 Office of Head Start (OHS) Expectations for Head Start Programs in Program Year (PY) 2021–2022</span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">Progress Toward Objective:</span><br><span style="font-size: 12pt;font-family: Times New Roman;">Participants increased their knowledge and understand the importance of the Community Assessment to ensure practices to assess their communities, to recruit, and to enroll children and families who are most in need. Participants understood the value/connection of the Community Assessment as the gateway into the program and have explored innovative strategies such as: </span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- flyers/stickers within the community</span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">– churches, local restaurants with an advertisement, food delivery services</span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- social media </span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- community events/bus/round-up </span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- videos </span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- spotlighting centers, classrooms, program, testimonials </span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- building connections/collaborations in the community/roundtables</span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- the increased use of technology</span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- use of cart advertising in local retailers</span>&nbsp;</p>\n<p>&nbsp;<span style="font-size: 12pt;font-family: Times New Roman", serif;">- COVID testing/vaccination sites </span>&nbsp;&nbsp;</p>\n<p></p>\n',
          isNew: false,
          arOrder: 1,
        },
      ],
    };

    const result = calculateGoalsAndObjectives(report);
    expect(result).toStrictEqual([
      [
        'Objective 1',
        'TTA Provided 1',
      ],
      [
        'Participants will  - understand the requirements of the community assessment through exploring the recommended methods for conducting, composing, and updating the document  - recognize the significance of the community assessment as a planning tool and identify strategies and resources intended to support immediate and future ERSEA services - examine the elements of effective outreach and recruitment - identify strategies for supporting grantees with recruitment to achieve and maintaining full enrollment',
        '<p><span style="font-size: 12pt;font-family: Times New Roman;">Grantee Specialists facilitated the Community Assessment and Recruitment – Looking At &amp; Beyond the Foundation Module Training. The dialogue was framed around program planning</span><br><span style="font-size: 12pt;font-family: Times New Roman;">with unknown challenges. Key elements of training include: </span></p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- a pandemic outlook </span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- community assessment regulations, new pandemic resources/materials, community changes/trials, data analysis/collection/response systems </span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- ERSEA regulations </span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- recruitment regulation, formal system, covering the full-service area, detecting new &amp; existing partnerships, not limiting recruitment, strategies for recruitment, social media, marketing in HS, communication, and specific efforts to actively locate/recruit children with disabilities and other vulnerable</span><br><span style="font-size: 12pt;font-family: Times New Roman;">children, including homeless children and children in foster care.</span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- Enrollment 1302.15 Office of Head Start (OHS) Expectations for Head Start Programs in Program Year (PY) 2021–2022</span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">Progress Toward Objective:</span><br><span style="font-size: 12pt;font-family: Times New Roman;">Participants increased their knowledge and understand the importance of the Community Assessment to ensure practices to assess their communities, to recruit, and to enroll children and families who are most in need. Participants understood the value/connection of the Community Assessment as the gateway into the program and have explored innovative strategies such as: </span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- flyers/stickers within the community</span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">– churches, local restaurants with an advertisement, food delivery services</span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- social media </span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- community events/bus/round-up </span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- videos </span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- spotlighting centers, classrooms, program, testimonials </span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- building connections/collaborations in the community/roundtables</span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- the increased use of technology</span>&nbsp;</p>\n<p><span style="font-size: 12pt;font-family: Times New Roman;">- use of cart advertising in local retailers</span>&nbsp;</p>\n<p>&nbsp;<span style="font-size: 12pt;font-family: Times New Roman", serif;">- COVID testing/vaccination sites </span>&nbsp;&nbsp;</p>\n<p></p>\n',
      ],
    ]);
  });
});
