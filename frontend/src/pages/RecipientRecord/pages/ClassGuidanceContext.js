import React, {
  createContext,
  useState,
  useContext,
  useEffect,
} from 'react';
import PropTypes from 'prop-types';
import { parseFeedIntoDom } from '../../../utils';
import { getClassGuidanceFeed } from '../../../fetchers/feed';

const ClassGuidanceContext = createContext();

export const ClassGuidanceProvider = ({ children }) => {
  const [classGuidanceData, setClassGuidanceData] = useState({});

  useEffect(() => {
    async function fetchGuidance() {
      try {
        const response = await getClassGuidanceFeed();
        const feedDom = parseFeedIntoDom(response);
        const summary = feedDom.querySelector('summary');
        const parser = new DOMParser();
        const summaryDoc = parser.parseFromString(summary.textContent, 'text/html');
        const guidanceContent = summaryDoc.body.querySelector('div.feed > div:nth-child(2)');

        /**
         * The content we want to capture from this feed article is everything
         * before the <hr /> tag. Everything after that is not needed.
         */
        const hr = guidanceContent.querySelector('hr');
        const content = hr.parentNode.childNodes;
        const fragment = document.createDocumentFragment();

        Array.from(content).some((node) => {
          if (node === hr) return true;
          fragment.appendChild(node);
          return false;
        });

        guidanceContent.innerHTML = '';
        guidanceContent.appendChild(fragment);

        // This is a giant table with a bunch of Confluence-specific styles and classes.
        // The only parts of this table we care about are the <p> tags.
        const ptags = Array.from(guidanceContent.querySelectorAll('p'), (p) => p.innerHTML);
        const newDiv = document.createElement('div');
        newDiv.innerHTML = ptags.join('<p/>');

        // The headings in the content are <strong> tags, e.g.: <p><strong>Some heading</strong></p>
        // Here, we replace them with <h3> tags.
        const strongs = Array.from(newDiv.querySelectorAll('strong'));
        strongs.forEach((strong) => {
          const h3 = document.createElement('h3');
          h3.textContent = strong.textContent;
          strong.parentNode.replaceChild(h3, strong);
        });

        // The contents of summary is a string representation of HTML.
        setClassGuidanceData(newDiv);
      } catch (e) {
        const fallbackGuidance = /* html */`
          <div>
            <h3 class="font-sans-sm">Quality thresholds</h3>
            <p>
              Beginning in November 2020, the quality thresholds represent
              OHS's expectation for all grantees regarding the quality of
              classroom learning environments. These thresholds do not trigger
              competition; rather, a grantee with a score below a quality
              threshold receives support from OHS in improving the quality of
              teacher-child interactions in the classroom. The quality thresholds
              are as follows:
            </p>
            <ul class="usa-list usa-list--unstyled">
              <li>6 for the Emotional Support domain.</li>
              <li>6 for the Classroom Organization domain.</li>
              <li>3 for the Instructional Support domain.</li>
            </ul>
            <h3 class="font-sans-sm">Competitive thresholds</h3>
            <p>
              Grantees with average CLASS® scores below the established
              competitive threshold on any of the three CLASS® domains is
              required to compete. The competitive thresholds are as follows:
            </p>
            <ul class="usa-list usa-list--unstyled">
              <li>5 for the Emotional Support domain.</li>
              <li>5 for the Classroom Organization domain.</li>
              <li>
                2.3 for the Instructional Support domain for CLASS® reviews
                conducted through July 31, 2025, and 2.5 for those conducted
                on or after Aug. 1, 2025.
              </li>
            </ul>
          </div>
        `;

        const template = document.createElement('template');
        template.innerHTML = fallbackGuidance.trim();
        const content = template.content.firstChild;

        setClassGuidanceData(content);
      }
    }

    fetchGuidance();
  }, []);

  return (
    <ClassGuidanceContext.Provider value={{
      classGuidanceData,
      setClassGuidanceData,
    }}
    >
      {children}
    </ClassGuidanceContext.Provider>
  );
};

export const useClassGuidance = () => useContext(ClassGuidanceContext);

ClassGuidanceProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
