import I18N from './I18N';

/**
 * A type of personal information of users.
 */
interface Info {
  // Related column name in users table
  columnName: string;
  // Description
  description: I18N;
};

export default Info;
