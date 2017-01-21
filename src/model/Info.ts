import Translation from './Translation';

/**
 * A type of personal information of users.
 */
interface Info {
  // Related column name in users table
  columnName: string;
  // Description
  description: Translation;
};

export default Info;
