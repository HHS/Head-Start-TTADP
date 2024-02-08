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
        const errorDiv = document.createElement('div');
        errorDiv.textContent = 'There was an error fetching this content.';
        setClassGuidanceData(errorDiv);
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
