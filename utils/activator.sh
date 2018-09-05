#!/bin/bash

# Constants
readonly TRUE=0
readonly FALSE=1

readonly VALID=0
readonly INVALID_EMAIL_MISMATCH=1
readonly INVALID_USER_NOT_EXIST=2
readonly INVALID_CSE_MAJOR=3
readonly INVALID_ALREADY_ACTIVATED=4

ERROR_FILE_NAMES[$INVALID_EMAIL_MISMATCH]="email-mismatch.csv"
ERROR_FILE_NAMES[$INVALID_USER_NOT_EXIST]="user-not-exist.csv"
ERROR_FILE_NAMES[$INVALID_CSE_MAJOR]="cse-major.csv"
readonly ERROR_FILE_NAMES

# Global variables
program_name=''
psql_options=''
csv_file=''
total_users=0
output_file='activate.sql'
group_idx=3
error_directory="activator-error"

# Global arrays
usernames=''
emails=''
majors=''
valids=''

function main() {
  parse_arguments "$@"
  validate_parsed_arguments
  load_csv
  validate_rows
  write_sql
}

function error() {
  echo "$@" 1>&2
}

function help() {
  echo "$program_name [options] [csv_file]"
  echo "  -p: Additional arguments to be passed to psql"
  echo "  -o: Output sql file. Default is activate.sql"
  echo "  -g: Group index to insert. Default is 3"
  echo "  -e: Error log directory. Default is activator-error"
}

function parse_arguments() {
  program_name="$0"
  while [ $# -gt 1 ]; do
    key="$1"
    case "$1" in
      -p)
        psql_options="$2"
        shift
        ;;
      -o)
        output_file="$2"
        shift
        ;;
      -g)
        group_idx="$2"
        shift
        ;;
      -e)
        error_directory="$2"
        shift
        ;;
      *)
        echo "Unknown option: $1"
        help
        exit 1
        ;;
    esac
    shift
  done
  csv_file="$1"
}

function validate_parsed_arguments() {
  if [ "$csv_file" == "" ]; then
    error "Error: csv file is not given."
    help
    exit 1
  elif [ ! -f "$csv_file" ]; then
    error "Error: $csv_file does not exist."
    exit 1
  elif [ ! -d "$error_directory" ] && ! mkdir "$error_directory"; then
    error "Error: creating error directory failed."
    exit 1
  fi
}

function load_csv() {
  # Read username
  local i=0
  while read username; do
    usernames[$i]="$username"
    i=`expr $i + 1`
  done <<< `csvtool drop 1 "$csv_file" | csvtool col 3 -`

  # Read email
  i=0
  while read email; do
    emails[$i]="$email"
    i=`expr $i + 1`
  done <<< `csvtool drop 1 "$csv_file" | csvtool col 4 -`

  # Read major
  i=0
  while read major; do
    if [ "$major" == "예" ]; then
      majors[$i]="$TRUE"
    else
      majors[$i]="$FALSE"
    fi
    i=`expr $i + 1`
  done <<< `csvtool drop 1 "$csv_file" | csvtool col 6 -`
  total_users="$i"
}

function validate_rows() {
  local i=0
  while [ $i -lt $total_users ]; do
    if is_activated "${usernames[$i]}"; then
      echo "Info: ${usernames[$i]} ignored, reason: already activated."
      valids[$i]=$INVALID_ALREADY_ACTIVATED
    elif [ ${majors[$i]} == $TRUE ]; then
      error "Warning: ${usernames[$i]} ignored, reason: cse major user."
      valids[$i]=$INVALID_CSE_MAJOR
    elif match_username_and_email "${usernames[$i]}" "${emails[$i]}"; then
      valids[$i]=$VALID
    elif user_exists "${usernames[$i]}"; then
      error "Warning: ${usernames[$i]} ignored, reason: email does not match in database."
      valids[$i]=$INVALID_EMAIL_MISMATCH
    else
      error "Warning: ${usernames[$i]} ignored, reason: user is not in our database."
      valids[$i]=$INVALID_USER_NOT_EXIST
    fi

    i=`expr $i + 1`
  done
}

# Check if is it safe to insert arguments to sql query
function query_insertion_check() {
  while [ $# -gt 0 ]; do
    if [ -z "${1##*\'*}" ] || [ -z "${1##*\;*}" ]; then
      error "Error: possible sql injection attack by string: $1"
      exit 2
    fi
    shift
  done
}

function is_activated() {
  local username="$1"

  query_insertion_check "$username"
  local query="select activated from users where username = '$username';"
  local result=`psql --no-align --tuples-only $psql_options <<< "$query"`

  if [ "$result" == "t" ]; then
    return $TRUE
  else
    return $FALSE
  fi
}

function user_exists() {
  local username="$1"

  query_insertion_check "$username"
  local query="select username from users where username = '$username';"
  local result=`psql --no-align --tuples-only $psql_options <<< "$query"`

  if [ "$result" == "$username" ]; then
    return $TRUE
  else
    return $FALSE
  fi
}

# Check if username and email match in database
function match_username_and_email() {
  local username="$1"
  local email=(${2//@/ })
  local email_local="${email[0]}"
  local email_domain="${email[1]}"

  query_insertion_check "$username" "$email_local" "$email_domain"
  local query="select owner_idx from email_addresses where address_local = '$email_local' and address_domain = '$email_domain';"
  local owner_idx=`psql --no-align --tuples-only $psql_options <<< "$query"`

  if [ "$owner_idx" == "" ]; then
    return $FALSE
  else
    query_insertion_check "$owner_idx"
    query="select username from users where idx = '$owner_idx'"
    local result=`psql --no-align --tuples-only $psql_options <<< "$query"`
    if [ "$result" == "$username" ]; then
      return $TRUE
    else
      return $FALSE
    fi
  fi
}

function write_sql() {
  echo "-- Generated by $program_name for $csv_file" > "$output_file"

  local i=0
  while [ $i -lt $total_users ]; do
    if [ ${valids[$i]} == $VALID ]; then
      local user_idx=`get_user_idx "${usernames[$i]}"`
      echo "update users set activated = true where username = '${usernames[$i]}';" >> "$output_file"
      echo "insert into user_memberships (user_idx, group_idx) values ('$user_idx', '$group_idx');" >> "$output_file"
    fi

    i=`expr $i + 1`
  done
}

function get_user_idx() {
  local username="$1"

  query_insertion_check "$username"
  query="select idx from users where username = '${usernames[$i]}';"
  psql --no-align --tuples-only $psql_options <<< "$query"
}

function write_error_csv() {
  rm "$error_directory/${ERROR_FILE_NAMES[$INVALID_EMAIL_MISMATCH]}" "$error_directory/${ERROR_FILE_NAMES[$INVALID_USER_NOT_EXIST]}" "$error_directory/${ERROR_FILE_NAMES[$INVALID_CSE_MAJOR]}"

  local i=0
  while [ $i -lt $total_users ]; do
    case "${valids[$i]}" in
      "$VALID")
        ;;
      "$INVALID_EMAIL_MISMATCH"|"$INVALID_USER_NOT_EXIST"|"$INVALID_CSE_MAJOR")
        echo "${usernames[$i]},${emails[$i]}" >> "$error_directory/$ERROR_FILE_NAMES[${valids[$i]}]"
        ;;
      *)
        error "Error: Invalid valid value: ${valids[$i]}"
        ;;
    esac

    i=`expr $i + 1`
  done
}

main "$@"
