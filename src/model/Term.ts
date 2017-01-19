import I18N from '../I18N';

interface Term {
  // Magic number of this term. Should not be changed once issued.
  // This value is stored in database to represent this term.
  termId: number;
  // Name of this term. Should not be changed once issued.
  // This value is used in URI for this term.
  name: string;
  // Title of this term.
  title: I18N;
  // Current revision number of this term.
  currentRevision: number;
  // Contents of this term.
  // Maps revision number of the term and content.
  contents: Array<I18N | undefined>;
}

export default Term;
