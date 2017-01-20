import I18N from './I18N';

/**
 * A rule between service providers and users,
 * which users must agree in order to use the related services.
 *
 * User's acceptance on terms are tracked with
 *   - the id of the user
 *   - the id of the term
 *   - the revision of the term at the time when the user accpeted the term
 *   - the time when the user accepted the term
 *
 * A user's acceptance on a specific term is evaluated as one of the followings
 *   - ok: the user has accepted on the current revision of the term
 *   - old: the user has accpeted on an outdated revision of the term
 *   - no: the user has not accepted on any revsions of the term
 * 'Outdated' means that the revision user has accepted is 'different' than the
 * current revision of the term.
 */
interface Term {
  // Magic number of this term. Should not be changed once issued.
  // This value is stored in database to represent this term.
  termId: number;
  // Name of this term. Should not be changed once issued.
  // This value is used as identifier for this term. (for URI or third party apps)
  name: string;
  // Title of this term.
  title: I18N;
  // Current revision number of this term.
  currentRevision: number;
  // Contents of the current revision of this term.
  contents: I18N;
}

export default Term;
