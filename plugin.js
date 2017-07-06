'use strict'

const Racebot = require('./racebot')


const CREATE_HELP_MESSAGE = function(args) {
    const commands = {
        help: "`.help <optional: command name>` --> Print this message, or if a command is given, print help for given command.",
        newrace: "`.newrace <optional: game name>` --> Create a new race for specified game. Must be done in racebot control channel.",
        setcountdowntime: "`.setcountdowntime or .setcountdowntimer [seconds]` --> Set the current race countdown timer length." ,
        deleterace: "`.deleterace or .dr <optional: seconds>` --> Delete current race after default deletion time, or optional specified length in seconds",
        keeprace: "`.keeprace or .kr` --> Prevent deletion of current race.",
        setgame: "`.setgame or .sg [game name]` --> Set the game of the current race.",
        setgoal: "`.setgoal [goal]` --> Set the goal of the current race.",
        time: "`.time` --> Show the current elapsed time.",
        enter: "`.enter or .e` --> Enter the current race.",
        unenter: "`.unenter` --> Unenter the current race.",
        ready: "`.ready or .r` --> Set yourself to ready status in the current race.",
        unready: "`.unready or .ur` --> Remove the ready status from yourself in the current race.",
        enterready: "`.enterready or .er` --> Enter the current race and ready up in a single command.",
        done: "`.done or .d` --> Finish the current race.",
        undone: "`.undone or .ud` --> Re-enter yourself in the current race after using `done` by mistake."
    }

    let msg = []

    // user passed in a command to get help about, return only that message
    if (args.length > 0 && commands.hasOwnProperty(args[0])) {
        msg.push(commands[args[0]])
    } else {
        // invalid or no command was passed to help, print all
        for (let key in commands) {
            msg.push(commands[key])
        }
    }

    return msg
}

module.exports = function(client) {
    let racebot = new Racebot()

    // misc
    client.registerCommand(['help'], (cmd_msg, args) => {
        cmd_msg.channel.sendMessage(CREATE_HELP_MESSAGE(args))
    })
    
    // control commands
    client.registerCommand(['newrace', 'nr'], racebot.create_race)
    client.registerCommand(['setcountdowntime', 'setcountdowntimer'], racebot.setcountdowntime)
    client.registerCommand(['deleterace', 'dr'], racebot.race_delete)
    client.registerCommand(['keeprace', 'kr'], racebot.race_keep)
    client.registerCommand(['setgame', 'sg'], racebot.race_set_game)
    client.registerCommand(['setgoal'], racebot.race_set_goal)
    client.registerCommand(['time'], racebot.race_print_time)

    // entrant commands
    client.registerCommand(['enter', 'e'], racebot.entrant_enter)
    client.registerCommand(['unenter', 'ue'], racebot.entrant_unenter) 
    client.registerCommand(['enterready', 'er'], racebot.entrant_enterready)
    client.registerCommand(['ready', 'r'], racebot.entrant_ready)
    client.registerCommand(['unready', 'ur'], racebot.entrant_unready)
    client.registerCommand(['done', 'd'], racebot.entrant_done)
    client.registerCommand(['undone', 'ud'], racebot.entrant_undone)

    // status commands
    client.registerCommand(['entrants', 'players', 'racers'], racebot.print_entrants)
}
