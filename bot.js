// imports
require('dotenv').config()
require('enve')
var fs = require('fs')
const Discord = require('discord.js')

// start
const client = new Discord.Client() // create client
client.on('ready', () => {
    console.log('Ready')
})
client.login(process.enve.TOKEN) // login
let settings = require('./settings.json') // settings i/o

// manually fetch
// const user = Discord.UserManager.fetch(settings.user)

// helper functions
const fetch = (user) => `${user.tag}: ${user.presence.status}` // manually fetch
const logToChannel = (message) => this.channels.get(settings.logChannel).send(message) // send to log channel
const updateSettings = (newSettings) => fs.writeFile('settings.json', JSON.stringify(newSettings), (err) => {
    return console.log("file writing error")
})

// trigger on voice status change
client.on('presenceUpdate', function (oldPresence, newPresence) {
    const dateTimeString = new Date().toISOString(), 
    const oldStatus = oldPresence.status, newStatus = newPresence.status
    // status checks
    if (newStatus === "offline") { // now offline
        logToChannel(settings.userTag)
    } else if (newStatus === "online") { // now online

    }
    console.log(`${dateTimeString} | ${settings.userTag} changed from: ${oldStatus} to: ${newStatus}`)
})

client.on('message', message => {
    const prefix = settings.prefix // set prefix
    if (!message.author.bot && message.content.startsWith(prefix)) { // check if sent by bot & check for prefix
        var args = message.content.slice(prefix.length).split(' ') // split
        const command = args.shift().toLowerCase()
        // run appropiate command
        if (command === 'user') { // set User
            if (args) {
                client.users.fetch(args)
                    .then(user => {
                        if (user.bot) {
                            settings.user = args, settings.userTag = `${user.tag}`
                            message.channel.send(`monitored bot set to ${settings.userTag}`)
                            updateSettings(settings)
                        } else {
                            message.channel.send(`user must be a bot to be monitored`)
                        }
                    })
                    .catch(error => {
                        message.channel.send (error.httpStatus === 404 ? 'user not found' : `error: ${error}`)
                    })
            } else {
                message.channel.send(`current monitored bots: ${settings.userName}`)
            }
        } else if (command === 'status') { // status of user
            helper.prefetch(message.guild)
            response = helper.stat.retreive()
        } else if (command === 'message') { // status of user
            helper.prefetch(message.guild)
            response = helper.stat.retreive()
        } else {
            response = strings.err.invalidCommand
        }
    }
})