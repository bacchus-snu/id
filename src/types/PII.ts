import Translation from './Translation';

/**
 * A type of personally identifiable information
 */
interface PII {
  // Related column name in users table
  users: string;
  // column name in classes table
  classes: string;
  // column name in users_classes table
  users_classes: string;
  // Description
  description: Translation;
};

export default PII;
