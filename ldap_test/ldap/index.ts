import * as ldap from 'ldapjs'

const server = ldap.createServer()
const users: Array<ldap.Entity> = [
  {
    dn: 'cn=bacchus,ou=cseusers,dc=snucse,dc=org',
    attributes: {
      uid: 'bacchus',
      cn: 'bacchus',
      gecos: 'AdminDescription',
      homeDirectory: '/home/bacchus',
      loginShell: '/bin/bash',
      objectclass: 'posixAccount',
      uidNumber: 10000,
      gidNumber: 1004,
    }
  }, {
    dn: 'cn=master,ou=cseusers,dc=snucse,dc=org',
    attributes: {
      cn: 'master',
      uid: 10001,
      gid: 10001,
      description: 'Admin2',
      homedirectory: '/home/master',
      shell: '/bin/bash',
      objectclass: 'unixUser',
    }
  }
]

server.listen(389, '127.0.0.1', () => console.log('Connected'))
server.bind('ou=cseusers,dc=snucse,dc=org', (req, res, next) => {
  console.log(req.dn.toString())
  if (req.dn.toString() !== 'cn=bacchus, ou=cseusers, dc=snucse, dc=org' || req.credentials !== 'password') {
    return next(new ldap.InvalidCredentialsError())
  }
  res.end()
  return next()
})
server.search('ou=cseusers, dc=snucse, dc=org', (req, res, next) => {
  if (req.dn.toString() === 'ou=cseusers, dc=snucse, dc=org') {
    res.send(users[0])
  }
  res.end()
  return next()
})

server.search('cn=bacchus,ou=cseusers, dc=snucse, dc=org', (req, res, next) => {
  if (req.dn.toString() === 'cn=bacchus, ou=cseusers, dc=snucse, dc=org') {
    res.send(users[0])
  }
  res.end()
  return next()
})
