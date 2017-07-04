'use strict'

const Race = require('./race')
let races = {}
const EMOJI_CHECK_GREEN = "\u2705"

// certain control commands should only be possible in control channels
// these channels should have a standardized name, it is as follows: 
const RACEBOT_CONTROL_CHANNEL_NAME = 'racebot'          

module.exports = function() {
    let api = {}

    api.create_race = function(cmd_msg, args) {
        if (cmd_msg.channel.name !== RACEBOT_CONTROL_CHANNEL_NAME) {
            cmd_msg.reply("This is not a racebot control channel, please use #racebot")
            return
        }

        let game_name = args.join("_") || "no_game"
        let new_race = new Race(cmd_msg.member, game_name)

        races[new_race.name] = new_race

        cmd_msg.guild.createChannel(0, new_race.name)
            .then(race_text_channel => {
                return new_race.set_channel(race_text_channel)
            })
            .then(race_text_channel => {
                return new_race.send_welcome_msg(race_text_channel, cmd_msg.member.name, game_name)
            })
            .then(welcome_msg => {
                return cmd_msg.reply("Race has been created. Join channel <#" + welcome_msg.channel.id + ">")
            })
            .catch(e => {
                if (!e) return
                cmd_msg.reply("Error creating race: " + e)
            })
    }

    api.entrant_enter = function(cmd_msg, args, return_promise = false) {
        let race_channel_name = cmd_msg.channel.name
        let guildmember = cmd_msg.member

        if (!races.hasOwnProperty(race_channel_name)) {
            cmd_msg.reply("Either this is not a race channel, or the race was not found.")
            return 
        }

        let result = races[race_channel_name].entrant_enter(guildmember)
            .then(() => {
                return cmd_msg.addReaction(EMOJI_CHECK_GREEN)
            })
            .catch(e => {
                if (!e) return
                cmd_msg.reply("Command failed: " + e)
            })

        if (return_promise) return result
    }

    api.entrant_unenter = function(cmd_msg, args) {
        let race_channel_name = cmd_msg.channel.name
        let guildmember = cmd_msg.member

        if (!races.hasOwnProperty(race_channel_name)) {
            cmd_msg.reply("Either this is not a race channel, or the race was not found.")
            return 
        }

        races[race_channel_name].entrant_unenter(guildmember)
            .then(() => {
                return cmd_msg.addReaction(EMOJI_CHECK_GREEN)
            })
            .catch(e => {
                if (!e) return
                cmd_msg.reply("Command failed: " + e)
            })
    }

    api.print_entrants = function(cmd_msg, args) {
        let race_channel_name = cmd_msg.channel.name

        if (!races.hasOwnProperty(race_channel_name)) {
            cmd_msg.reply("Either this is not a race channel, or the race was not found.")
            return 
        }

        races[race_channel_name].print_entrants()
            .catch(e => {
                if (!e) return
                cmd_msg.reply("Command failed: " + e)
            })
    }

    api.race_print_time = function(cmd_msg, args) {
        let race_channel_name = cmd_msg.channel.name

        if (!races.hasOwnProperty(race_channel_name)) {
            cmd_msg.reply("Either this is not a race channel, or the race was not found.")
            return
        }

        races[race_channel_name].print_time()
            .catch(e => {
                if (!e) return
                cmd_msg.reply("Command failed: " + e)
            })
    }

    api.entrant_ready = function(cmd_msg, args, return_promise = false) {
        let race_channel_name = cmd_msg.channel.name
        let guildmember = cmd_msg.member

        if (!races.hasOwnProperty(race_channel_name)) {
            cmd_msg.reply("Either this is not a race channel, or the race was not found.")
            return
        }
        
        let result = races[race_channel_name].entrant_ready(guildmember)
            .then(() => {
                cmd_msg.addReaction(EMOJI_CHECK_GREEN)

                // check if we can start the race yet
                return races[race_channel_name].check_all_ready()
            })
            .then(res => {
                if (!res.all_ready) return Promise.reject()
                return races[race_channel_name].start()
            })
            .catch(e => {
                if (!e) return
                cmd_msg.reply("Command failed: " + e)
            })

        if (return_promise) return result
    }

    api.entrant_unready = function(cmd_msg, args) {
        let race_channel_name = cmd_msg.channel.name
        let guildmember = cmd_msg.member

        if (!races.hasOwnProperty(race_channel_name)) {
            cmd_msg.reply("Either this is not a race channel, or the race was not found.")
            return 
        }
        
        races[race_channel_name].entrant_unready(guildmember)
            .then(() => {
                return cmd_msg.addReaction(EMOJI_CHECK_GREEN)
            })
            .catch(e => {
                if (!e) return
                cmd_msg.reply("Command failed: " + e)
            })
    }

    api.entrant_enterready = function(cmd_msg, args) {
        let race_channel_name = cmd_msg.channel.name
        let guildmember = cmd_msg.member

        if (!races.hasOwnProperty(race_channel_name)) {
            cmd_msg.reply("Either this is not a race channel, or the race was not found.")
            return 
        }

        api.entrant_enter(cmd_msg, args, true)
            .then(() => api.entrant_ready(cmd_msg, args, true))
            .catch(e => {
                if (!e) return
                cmd_msg.reply("Command failed: " + e)
            })
    }

    api.race_delete = function(cmd_msg, args, return_promise = false) {
        let race_channel_name = cmd_msg.channel.name

        if (!races.hasOwnProperty(race_channel_name)) {
            cmd_msg.reply("Either this is not a race channel, or the race was not found.")
            return 
        }

        // pass timeout_length as undefined if no arg is given
        // race.delete function will use its default value
        let timeout_length
        if (args.length > 0) {
            timeout_length = (args[0] === "now") ? 0 : parseInt(args[0]) * 1000     // convert to millaseconds
        }

        let result = races[race_channel_name].delete(timeout_length)
            .then(() => {
                // race object deleted its own channel,
                // now let's delete the race object
                delete races[race_channel_name]
                return
            })
            .catch(e => {
                if (!e) return
                cmd_msg.reply("Command failed: " + e)
            })

        if (return_promise) {
            return result
        }
    }

    api.race_keep = function(cmd_msg, args) {
        let race_channel_name = cmd_msg.channel.name

        if (!races.hasOwnProperty(race_channel_name)) {
            cmd_msg.reply("Either this is not a race channel, or the race was not found.")
            return
        }

        races[race_channel_name].keep()
            .catch(e => {
                if (!e) return
                cmd_msg.reply("Command failed: " + e)
            })
    }

    api.race_set_game = function(cmd_msg, args) {
        let race_channel_name = cmd_msg.channel.name

        if (!races.hasOwnProperty(race_channel_name)) {
            cmd_msg.reply("Either this is not a race channel, or the race was not found.")
            return
        }

        races[race_channel_name].set_game(args.join("_"))
            .then(new_race_name => {
                cmd_msg.addReaction(EMOJI_CHECK_GREEN)

                // update races with new name
                races[new_race_name] = races[race_channel_name]
                delete races[race_channel_name]
            })
            .catch(e => {
                if (!e) return
                cmd_msg.reply("Command failed: " + e)
            })
    }

    api.race_set_goal = function(cmd_msg, args) {
        let race_channel_name = cmd_msg.channel.name

        if (!races.hasOwnProperty(race_channel_name)) {
            cmd_msg.reply("Either this is not a race channel, or the race was not found.")
            return
        }

        races[race_channel_name].set_goal(args.join(" "))
            .then(() => {
                cmd_msg.addReaction(EMOJI_CHECK_GREEN)
            })
            .catch(e => {
                if (!e) return
                cmd_msg.reply("Command failed: " + e)
            })
    }

    api.entrant_done = function(cmd_msg, args) {
        let race_channel_name = cmd_msg.channel.name
        let guildmember = cmd_msg.member

        if (!races.hasOwnProperty(race_channel_name)) {
            cmd_msg.reply("Either this is not a race channel, or the race was not found.")
            return
        }

        races[race_channel_name].entrant_done(guildmember)
            .then(() => races[race_channel_name].check_all_done())
            .then(all_done => {
                if (!all_done) return Promise.reject()
                return races[race_channel_name].complete()
            })
            .then(() => {
                return api.race_delete(cmd_msg, args, true)
            })
            .catch(e => {
                if (!e) return
                cmd_msg.reply("Command failed: " + e)
            })
    }

    api.entrant_undone = function(cmd_msg, args) {
        let race_channel_name = cmd_msg.channel.name
        let guildmember = cmd_msg.member

        if (!races.hasOwnProperty(race_channel_name)) {
            cmd_msg.reply("Either this is not a race channel, or the race was not found.")
            return
        }

        races[race_channel_name].entrant_undone(guildmember)
            .then(() => {
                cmd_msg.addReaction(EMOJI_CHECK_GREEN)
            })
            .catch(e => {
                if (!e) return
                cmd_msg.reply("Command failed: " + e)
            })
    }

    api.setcountdowntime = function(cmd_msg, args) {
        let race_channel_name = cmd_msg.channel.name

        if (!races.hasOwnProperty(race_channel_name)) {
            cmd_msg.reply("Either this is not a race channel, or the race was not found.")
            return
        }

        races[race_channel_name].set_countdown_time(args[0])
            .then(() => {
                cmd_msg.addReaction(EMOJI_CHECK_GREEN)
            })
            .catch(e => {
                if (!e) return
                cmd_msg.reply("Command failed: " + e)
            })
    }

    return api
}
