// imports
require('dotenv').config()
const fs = require('fs')
const Discord = require('discord.js')
const fastify = require('fastify')()
const statusMessage = {
  online: 'online 🟢',
  idle: 'idle 🌙',
  offline: 'offline ⭕',
  dnd: 'dnd 🔴',
  undefined: 'undefined ⚪'
}
const statusCode = {
  online: 200,
  idle: 202,
  offline: 503,
  dnd: 410,
  undefined: 500
}
// temporarily stores last presence to check for sharding repeats
let changeCount = 0
const startUpDate = new Date()
const settings = require('./settings.json') // settings i/o

// start
const client = new Discord.Client() // create client
client.on('ready', () => { console.log('Discord bot ready') })
client.login(process.env.TOKEN) // login

const userStatus = (user) => `**${user.tag}:** ${statusMessage[user.presence.status]}` // manually fetch
const logToChannel = (message) => { // send to log channel
  if (settings.logChannel) client.channels.cache.get(settings.logChannel).send(message)
}
const updateSettings = (newSettings) => fs.writeFile('settings.json', JSON.stringify(newSettings), (err) => {
  if (err) console.log(err)
})
function alert (message) { // send "alert"
  logToChannel(`\`${message}\``)
  if (settings.alertMessage) logToChannel(settings.alertMessage)
}

client.on('presenceUpdate', function (oldPresence, newPresence) { // trigger on presence
  if (newPresence.userID === settings.user) {
    // craft response
    const oldStatus = (oldPresence ? oldPresence.status : undefined)
    const newStatus = newPresence.status
    const message = `[${new Date().toUTCString()}] ${newPresence.user.userTag} changed from ${statusMessage[oldStatus]} to ${statusMessage[newStatus]}`
    if ((oldStatus === 'offline' && newStatus === 'online') || (oldStatus === 'online' && newStatus === 'offline')) alert(message)
    console.log(message)
    // log change
    changeCount++
  }
})

client.on('message', message => {
  const prefix = settings.prefix // set prefix
  if (!message.author.bot && message.content.startsWith(prefix)) { // check if sent by bot & check for prefix
    const args = message.content.slice(prefix.length).split(' ') // split
    const command = args.shift().toLowerCase()
    if (command === 'user') {
      if (args.length) {
        client.users.fetch(args[0])
          .then(user => {
            settings.user = args[0]
            message.channel.send(`monitored user set to ${user.tag}`)
            updateSettings(settings)
          })
          .catch(error => {
            message.channel.send(error.httpStatus === 404 ? 'user not found' : `error: ${error}`)
          })
      } else {
        client.users.fetch(args[0])
          .then(user => { message.channel.send(`current monitored user: ${user.userTag}`) })
          .catch(error => { message.channel.send(error.httpStatus === 404 ? 'user not found' : `error: ${error}`) })
      }
    } else if (command === 'status') { // status of user
      client.users.fetch(settings.user)
        .then(user => { message.channel.send(userStatus(user)) })
        .catch(error => { message.channel.send(`error: ${error}`) })
    } else if (command === 'prefix') {
      if (args.length) {
        settings.prefix = args[0]
        updateSettings(settings)
        message.channel.send(`new prefix is: ${settings.prefix}`)
      } else { // no prefix found
        message.channel.send(`current prefix is ${settings.prefix}`)
      }
    } else if (command === 'stats') { // status of user
      message.channel.send(`There have been ${changeCount} presence changes since \`${startUpDate.toString()}\``)
    } else {
      message.channel.send('Invalid command - commands are user, status, prefix, and stats')
    }
  }
})

function startWebserver () {
  fastify.get('/status', function (request, reply) {
    client.users.fetch(settings.user)
      .then(user => {
        const status = user.presence.status
        reply.code(statusCode[status]).send({ user: user.tag, status: statusMessage[status] })
      }).catch(error => { reply.code(500).send(`error: ${error}`) })
  })

  fastify.get('/', function (request, reply) {
    reply.redirect(302, '/status')
  })
  fastify.get('*', function (request, reply) {
    reply.code(404).send()
  })
  fastify.listen(3000, function (err, address) {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    console.log(`server listening on ${address}`)
  })
}
startWebserver()
