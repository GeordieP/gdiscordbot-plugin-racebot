'use strict'

const Entrant = require('./entrant')

let START_COUNTDOWN_LENGTH = 30   // seconds
const CHANNEL_DELETE_TIMEOUT = 300000       // 5 minutes

const CREATE_WELCOME_MSG = function(channel_name, creator_name, game_name) {
    return [
        "**Welcome to race channel " + channel_name + "**",
        "\n__Enter/Leave__",
        "To enter, use command `!enter` To unenter, use command `!unenter`",
        "\n__Readying Up__",
        "Once you are entered, use command `!ready` to ready up To unready, use command `!unready`",
        "\n__Starting Race__",
        "Race will start once all entrants do !ready, following a countdown",
        "\n__Ending Race__",
        "When you are finished, use command `!done` If you use this command by mistake, do `!undone` to re-enter the race",
        "Race will end automatically once all entrants are done or have forefitted",
        "```js\nCreator: '" + creator_name + "' | Game: '" + game_name + "'```",
    ]
}

// for race start countdown messages
// define these as constants (instead of inline) because it makes a surprising impact on performance
const GO_MSG = "**GO!**"
const DISPLAY_MSG_AT_TIMES = [20, 10, 5]
let sent_countdown_msg_ref = null

// for printing entrants lists
const REGEX_MATCH_LAST_COMMA = /,\s*$/

module.exports = function(creator_guildmember, game_name) {
    let api = {}

    /*---
    * private
    ---*/

    this.channel = null
    this.start_countdown_timer = null
    this.delete_channel_timeout = null      // holds the timeout object
    this.start_countdown_timer_value = START_COUNTDOWN_LENGTH
    this.entrants = {}
    this.finishers = []
    this.race_start_time = -1

    api.game = game_name
    // TODO: replace spaces in race_name with underscores for racename
    api.name = api.game + "_" + Date.now()
    api.creator_guildmember = creator_guildmember

    /*---
    * methods
    ---*/

    api.set_channel = (channel) => {
        this.channel = channel
        if (!this.channel) return Promise.reject("Channel wasn't set properly")

        return Promise.resolve(this.channel)
    }

    api.send_welcome_msg = (channel, creator_name, game_name) => {
        return channel.sendMessage(CREATE_WELCOME_MSG(
                channel.name,
                creator_name,
                game_name
            ))
    }

    api.delete = (timeout = CHANNEL_DELETE_TIMEOUT) => {
        if (this.race_start_time !== -1) {
            return Promise.reject("Race is in progress")
        }
        
        // TODO:
        // let msg = "Channel will be deleted in " + TIME_FORMAT(timeout) + ". To prevent deletion, use command `!keeprace`, or challenge the racers to a `!rematch`."
        let msg = "Channel will be deleted in " + TIME_FORMAT(timeout) + ". To prevent deletion, use command `!keeprace`"

        return new Promise((resolve, reject) => {
            return this.channel.sendMessage(msg)
                .then(msg => {
                    this.delete_channel_timeout = setTimeout(() => {
                        return this.channel.delete()
                            .then(() => {
                                resolve()
                            })
                            .catch(e => {
                                reject(e)
                            })
                    }, timeout)
                })
        })
    }

    api.keep = () => {
        if (this.delete_channel_timeout == null) {
            return Promise.reject("Err: No channel delete timeout was found")
        }

        clearTimeout(this.delete_channel_timeout)
        this.delete_channel_timeout = null

        return this.channel.sendMessage("Channel will no longer be deleted automatically. Use `!deleterace` to delete the channel manually.")
    }

    api.start = () => {
        if (this.start_countdown_timer !== null) {
            return
        }

        this.start_countdown_timer_value = START_COUNTDOWN_LENGTH

        // ping all entrants in one message
        let ping_msg = "RACE STARTING SOON"
        for (let key in this.entrants) {
            ping_msg += " <@" + this.entrants[key].id + ">"
        }
        this.channel.sendMessage(ping_msg)

        // send warning message
        this.channel.sendMessage("__**Race beginning in " + this.start_countdown_timer_value + " seconds!**__")

        this.start_countdown_timer = setInterval(COUNTDOWN_FUNC, 1000)
    }

    const COUNTDOWN_FUNC = () => {
        this.start_countdown_timer_value--

        if (this.start_countdown_timer_value == 0) {
            this.race_start_time = Date.now()
            this.channel.sendMessage(GO_MSG)
        } else if (this.start_countdown_timer_value <= -5) {
            // we've gone past 0, kill the timer and reset everything
            clearInterval(this.start_countdown_timer)
            this.start_countdown_timer = null
            sent_countdown_msg_ref = null
        } else if (this.start_countdown_timer_value <= 3 && this.start_countdown_timer_value > 0) {
            // discord has a message send rate cap
            // instead of sending a message for each countdown tick, edit the existing one
            if (sent_countdown_msg_ref == null) {
                this.channel.sendMessage(this.start_countdown_timer_value + "...")
                    .then(msg => {
                        sent_countdown_msg_ref = msg
                    })
            } else {
                sent_countdown_msg_ref.edit(sent_countdown_msg_ref.content + "\n" + this.start_countdown_timer_value + "... ")
            }
        } else if (DISPLAY_MSG_AT_TIMES.indexOf(this.start_countdown_timer_value) > -1) {
            this.channel.sendMessage(this.start_countdown_timer_value + " seconds")
        }
    }

    api.complete = () => {
        let msg = ["**__Race Complete__**"]

        for (let key in this.finishers) {
            let entrant = this.finishers[key]
            msg.push("**[" + entrant.finish_place() + "]** " + entrant.name + " - `" + entrant.formatted_finish_time() + "`")
        }

        // reset start time so we can tell the race is over
        this.race_start_time = -1

        return this.channel.sendMessage(msg)
    }

    api.entrant_enter = (guildmember) => {
        // handle illegal cases
        switch(true) {
            case (this.entrants.hasOwnProperty(guildmember.id)):        // user is already entered
            case (this.race_start_time !== -1):                         // race is in progress
                return Promise.reject()
        }

        let entrant = new Entrant(guildmember)
        this.entrants[guildmember.id] = entrant
        return Promise.resolve()
    }

    api.print_entrants = () => {
        let msg = []

        let entered = ''
        let ready = ''
        let done = ''

        for (let key in this.entrants) {
            let entrant = this.entrants[key]

            if (entrant.is_done()) {
                done = done + "**[" + entrant.finish_place() + "]** " + entrant.name + " - `" + entrant.formatted_finish_time() + "`\n"
            } else if (entrant.is_ready()) {
                ready = ready + entrant.name + ', '
            } else {
                entered = entered + entrant.name + ', '
            }
        }

        if (entered !== '') {
            msg = msg.concat("**__NOT READY__**")
                .concat(entered.replace(REGEX_MATCH_LAST_COMMA, ""))
        }

        if (ready !== '') {
            msg = msg.concat("\n**__READY__**")
                .concat(ready.replace(REGEX_MATCH_LAST_COMMA, ""))
        }

        if (done !== '') {
            msg = msg.concat("\n**__DONE__**")
                .concat(done.replace(REGEX_MATCH_LAST_COMMA, ""))
        }

        return this.channel.sendMessage(msg)
    }

    api.entrant_unenter = (guildmember) => {
        // handle illegal cases
        switch(true) {
            case (!this.entrants.hasOwnProperty(guildmember.id)):
                return Promise.reject("User is not in this race.")
            case (this.race_start_time != -1):                          // race is in progress
                return Promise.reject()
        }

        delete this.entrants[guildmember.id]
        return Promise.resolve()
    }

    api.entrant_ready = (guildmember) => {
        // handle illegal cases
        switch(true) {
            case (!this.entrants.hasOwnProperty(guildmember.id)):
                return Promise.reject("User is not in this race.")
            case (this.entrants[guildmember.id].is_ready()):        // user is already ready
            case (this.race_start_time != -1):                      // race is in progress
                return Promise.reject()
        }

        return this.entrants[guildmember.id].ready()
    }

    api.entrant_unready = (guildmember) => {
        // handle illegal cases
        switch(true) {
            case (!this.entrants.hasOwnProperty(guildmember.id)):
                return Promise.reject("User is not in this race.")
            case (!this.entrants[guildmember.id].is_ready()):       // user is already not ready
            case (this.entrants[guildmember.id].is_done()):         // user is done
            case (this.race_start_time !== -1):                     // race is in progress
                return Promise.reject()
        }

        return this.entrants[guildmember.id].unready()
    }

    api.check_all_ready = () => {
        if (Object.keys(this.entrants).length < 2) {
            return Promise.resolve({
                all_ready: false,
                msg: "Not enough entrants"
            })
        }

        for (let key in this.entrants) {
            let entrant = this.entrants[key]
            if (!entrant.is_ready()) {
                return Promise.resolve({
                    all_ready: false,
                    msg: "Not all users are ready."
                })
            }
        }

        return Promise.resolve({all_ready: true})
    }

    api.entrant_done = (guildmember) => {
        let entrant_finish_time = Date.now()

        // handle illegal cases
        switch(true) {
            case (this.race_start_time === -1):
                return Promise.reject("Race was never started, or encountered an error")
            case (!this.entrants.hasOwnProperty(guildmember.id)):
                return Promise.reject("User appears to not have been in the race, an error may have occurred. Finish time was `" + formatted_finish_time + "`")
            case (this.entrants[guildmember.id].is_done()):
                // entrant is already done
                return Promise.reject()
        }

        let formatted_finish_time = TIME_FORMAT(entrant_finish_time - this.race_start_time)

        let entrant = this.entrants[guildmember.id]
        this.finishers.push(entrant)
        entrant.done(entrant_finish_time, formatted_finish_time, this.finishers.length)
        this.channel.sendMessage("**" + entrant.name + "** Finished in position **" + entrant.finish_place() + "** with a time of `" + entrant.formatted_finish_time() + "`")

        return Promise.resolve()
    }

    api.check_all_done = () => Promise.resolve(Object.keys(this.entrants).length === this.finishers.length)

    api.set_countdown_time = (time) => {
        START_COUNTDOWN_LENGTH = time
        return Promise.resolve()
    }

    return api
}

const TIME_FORMAT = function(ms) {
    let secs = Math.floor(ms / 1000)
    let msleft = ms % 1000
    
    let hours = Math.floor(secs / (60 * 60))
    if (hours.toString().length < 2) {
        hours = "0" + hours
    }
    
    let divisor_for_minutes = secs % (60 * 60)
    let minutes = Math.floor(divisor_for_minutes / 60)

    if (minutes.toString().length < 2) {
        minutes = "0" + minutes
    }

    let divisor_for_seconds = divisor_for_minutes % 60
    let seconds = Math.ceil(divisor_for_seconds)

    if (seconds.toString().length < 2) {
        seconds = "0" + seconds
    }

    if (msleft.toString().length < 2) {
        msleft = "0" + msleft
    }

    if (msleft.toString().length > 2) {
        msleft = msleft.toString().slice(0, 2)
    }

    return hours +":"+ minutes +":"+ seconds +"."+ msleft
}
