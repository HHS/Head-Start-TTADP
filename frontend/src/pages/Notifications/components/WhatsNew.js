import React, { useMemo, useEffect } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import Container from '../../../components/Container';
import FeedArticle from './FeedArticle';

const LOCAL_STORAGE_KEY = 'whatsnew-read-notifications';

const CURRENT_YEAR = moment().year();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const parseFeedIntoDom = (feed) => (feed ? new window.DOMParser().parseFromString(feed, 'text/xml') : null);

export const formatWhatsNew = (feed) => {
  const dom = parseFeedIntoDom(feed);
  if (!dom) {
    return null;
  }

  let alreadyRead = [];

  try {
    const storage = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    console.log('storage', storage);
    if (storage) {
      alreadyRead = JSON.parse(storage);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('local storage unavailable', error);
  }

  // get individual entries
  const entries = dom.querySelectorAll('entry');

  const articles = Array.from(entries).map((entry) => {
    // first we need to get the date tag from the provπided tags
    const tags = Array.from(entry.querySelectorAll('category')).map((category) => category.getAttribute('term'));
    const date = tags.filter((tag) => tag !== 'whatsnew')[0];

    // given a string like january2021, split it into an array of ['january', '2021']
    const [month, year] = date.split(/(\d+)/).filter((s) => s);
    const id = entry.querySelector('id') ? entry.querySelector('id').textContent : null;
    const unread = !alreadyRead.includes(id);

    return {
      title: entry.querySelector('title').textContent,
      content: entry.querySelector('summary').textContent,
      published: moment(entry.querySelector('published').textContent),
      month: month[0].toUpperCase() + month.substring(1), // capitalize the month
      id,
      year,
      unread,
    };
  });

  // sort into year and month like { 2021: { January: [articles] } }
  const sortedArticles = articles.reduce((acc, article) => {
    const { year, month } = article;
    if (!acc[year]) {
      acc[year] = {};
    }
    if (!acc[year][month]) {
      acc[year][month] = [];
    }
    acc[year][month].push(article);
    acc[year][month].sort((a, b) => b.published - a.published);
    return acc;
  }, {});

  // sort arrays by year and month
  Object.keys(sortedArticles).forEach((year) => {
    const months = Object.keys(sortedArticles[year]);
    months.sort((a, b) => MONTHS.indexOf(b) - MONTHS.indexOf(a));
    sortedArticles[year] = months.reduce((acc, month) => {
      acc[month] = sortedArticles[year][month];
      return acc;
    }, {});
  });

  return sortedArticles;
};

export default function WhatsNew({ data }) {
  const articles = useMemo(() => {
    if (!data) {
      return {};
    }
    return formatWhatsNew(data);
  }, [data]);

  useEffect(() => {
    try {
      // set the loaded articles as seen
      const articleIds = articles ? Object.values(articles).reduce((acc, year) => {
        const months = Object.values(year);
        months.forEach((month) => {
          month.forEach((article) => {
            acc.push(article.id);
          });
        });
        return acc;
      }, []) : [];

      // we don't need to save anything if there are no articles
      if (!articleIds.length) {
        return;
      }

      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(articleIds));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('local storage unavailable', error);
    }
  }, [articles]);

  return (
    <Container>
      <h2 className="font-serif-xl margin-0">What&apos;s New</h2>
      <div className="ttahub-feed">
        {YEARS.map((year) => (
          <div key={year}>
            {articles[`${year}`] && (
              Object.keys(articles[`${year}`]).map((month) => (
                <div key={month}>
                  <h3 className="font-sans-lg">
                    {month}
                    {' '}
                    {year}
                  </h3>
                  {articles[`${year}`][month].map((article) => (
                    <FeedArticle
                      key={article.title}
                      title={article.title}
                      content={article.content}
                      published={article.published}
                      unread={article.unread}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </Container>
  );
}

WhatsNew.propTypes = {
  data: PropTypes.string.isRequired,
};
