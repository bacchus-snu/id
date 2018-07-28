import createLDAPServer from './ldap/server'

const server = createLDAPServer()
server.listen(389, '127.0.0.1')
