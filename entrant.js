'use strict'

module.exports = function(guildmember) {
    let api = {}

    this.ready = false
    this.done = false
    this.finish_time
    this.formatted_finish_time
    this.finish_place

    api.guildmember = guildmember
    api.name = guildmember.name
    api.id = guildmember.id

    /*---
    * methods
    ---*/

    // ready
    api.ready = () => {
        this.ready = true
        return Promise.resolve()
    }

    api.unready = () => {
        this.ready = false
        return Promise.resolve()
    }

    api.is_ready = () => {
        return this.ready
    }

    // done
    api.done = (finish_time, formatted_finish_time, finish_place) => {
        this.done = true
        this.finish_time = finish_time
        this.formatted_finish_time = formatted_finish_time
        api.set_finish_place(finish_place)
    }

    api.set_finish_place = (finish_place) => {
        this.finish_place = finish_place
    }

    api.undone = () => {
        this.done = false
        this.finish_time = -1
        this.formatted_finish_time = -1
        this.finish_place = -1
    }

    api.is_done = () => {
        return this.done
    }

    api.finish_time = () => {
        return this.finish_time
    }
    
    api.formatted_finish_time = () => {
        return this.formatted_finish_time
    }

    api.finish_place = () => {
        return this.finish_place
    }

    return api
}
