// imports
require('dotenv').config()
require('enve')
const fs = require('fs')
const Discord = require('discord.js')
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
const strings = {
  adminOnly: 'command only available to admins',
  invalidCommand: 'Invalid command - commands are user, status and prefix',
  noPrefix: 'please state new prefix'
}
const express = require('express')
const app = express()

// start
const client = new Discord.Client() // create client
client.on('ready', () => {
  console.log('Discord bot ready')
})
client.login(process.enve.TOKEN) // login
const settings = require('./settings.json') // settings i/o

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
    const oldStatus = (oldPresence ? oldPresence.status : undefined)
    const newStatus = newPresence.status
    const message = `[${new Date().toUTCString()}] ${settings.userTag} changed from ${statusMessage[oldStatus]} to ${statusMessage[newStatus]}`
    if ((oldStatus === 'offline' && newStatus === 'online') || (oldStatus === 'online' && newStatus === 'offline')) alert(message)
    console.log(message)
  }
})

client.on('message', message => {
  const prefix = settings.prefix // set prefix
  if (!message.author.bot && message.content.startsWith(prefix)) { // check if sent by bot & check for prefix
    const args = message.content.slice(prefix.length).split(' ') // split
    const command = args.shift().toLowerCase()
    const isAdmin = settings.admins.includes(message.author.id) && settings.adminOnly
    if (command === 'user') {
      if (args.length) {
        if (isAdmin) {
          client.users.fetch(args[0])
            .then(user => {
              settings.user = args[0]
              settings.userTag = `${user.tag}`
              message.channel.send(`monitored user set to ${settings.userTag}`)
              updateSettings(settings)
            })
            .catch(error => {
              message.channel.send(error.httpStatus === 404 ? 'user not found' : `error: ${error}`)
            })
        } else { // not admin
          message.channel.send(strings.adminOnly)
        }
      } else { // no arg
        message.channel.send(`current monitored user: ${settings.userTag}`)
      }
    } else if (command === 'status') { // status of user
      client.users.fetch(settings.user)
        .then(user => {
          message.channel.send(userStatus(user))
        })
        .catch(error => {
          message.channel.send(`error: ${error}`)
        })
    } else if (command === 'prefix') {
      if (isAdmin) {
        if (args.length) {
          settings.prefix = args[0]
          updateSettings(settings)
          message.channel.send(`new prefix is: ${settings.prefix}`)
        } else { // no prefix found
          message.channel.send(settings.noPrefix)
        }
      } else { // no admin
        message.channel.send(strings.adminOnly)
      }
    } else {
      message.channel.send(strings.invalidCommand)
    }
  }
})

function startWebserver () {
  app.get('/status', function (req, res) {
    client.users.fetch(settings.user)
      .then(user => {
        const status = user.presence.status
        res.status(statusCode[status]).send({ user: user.tag, status: statusMessage[status] })
      })
      .catch(error => {
        res.status(500).send(`error: ${error}`)
      })
  })
  app.get('*', function (req, res) {
    res.status(404).send()
  })
  app.listen(3000, function () {
    console.log('webserver started on port 3000')
  })
}
startWebserver()
