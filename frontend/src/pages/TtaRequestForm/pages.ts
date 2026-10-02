import type { TtaRequestPage } from './types';
import goalAndContext from './pages/goalAndContext';
import submitForReview from './pages/submitForReview';
import whoIsTheRequestFor from './pages/whoIsTheRequestFor';

const pages: TtaRequestPage[] = [whoIsTheRequestFor, goalAndContext, submitForReview];

export default pages;
