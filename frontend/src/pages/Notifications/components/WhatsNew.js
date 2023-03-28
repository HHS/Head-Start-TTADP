import React from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import Container from '../../../components/Container';
import ReadOnlyEditor from '../../../components/ReadOnlyEditor';

const FULL_DATE_FORMAT = 'MMMM D, YYYY';
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

const formatWhatsNew = (feed) => {
  const dom = parseFeedIntoDom(feed);

  if (!dom) {
    return null;
  }

  // get individual entries
  const entries = dom.querySelectorAll('entry');

  const articles = Array.from(entries).map((entry) => {
    // first we need to get the date tag from the provided tags
    const tags = Array.from(entry.querySelectorAll('category')).map((category) => category.getAttribute('term'));
    const date = tags.filter((tag) => tag !== 'whatsnew')[0];

    // given a string like january2021, split it into an array of ['january', '2021']
    const [month, year] = date.split(/(\d+)/).filter((s) => s);

    return {
      title: entry.querySelector('title').textContent,
      content: entry.querySelector('summary').textContent,
      published: moment(entry.querySelector('published').textContent),
      month: month[0].toUpperCase() + month.substring(1), // capitalize the month
      year,
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

const FeedArticle = ({ title, content, published }) => (
  <article className="ttahub-feed-article ttahub-feed-article__whats-new position-relative ttahub-feed-article__whats-new--unread margin-bottom-3">
    <span className="ttahub-feed-article__whats-new--date font-body-xs padding-left-4">{published.format(FULL_DATE_FORMAT)}</span>
    <div className="ttahub-feed-article__whats-new-content position-relative padding-left-4">
      <h4 className="usa-prose margin-0 padding-0">{title}</h4>
      <ReadOnlyEditor value={content} ariaLabel={title} />
    </div>
  </article>
);

FeedArticle.propTypes = {
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  published: PropTypes.string.isRequired,
};

export default function WhatsNew({ data }) {
  const articles = (() => {
    if (!data) {
      return {};
    }
    return formatWhatsNew(data);
  })();

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
