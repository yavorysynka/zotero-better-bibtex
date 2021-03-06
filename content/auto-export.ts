declare const Zotero: any
declare const Components: any

import debug = require('./debug.ts')

import Queue = require('better-queue')
import MemoryStore = require('better-queue-memory')
import Events = require('./events.ts')
import DB = require('./db/main.ts')
import Translators = require('./translators.ts')
import Prefs = require('./prefs.ts')

function queueHandler(handler) {
  return (task, cb) => {
    handler(task).then(() => cb(null)).catch(err => {
      debug('AutoExport: task failed', task, err)
      cb(err)
    })

    return {
      cancel() { task.cancelled = true },
    }
  }
}

const scheduled = new Queue(
  queueHandler(
    async task => {
      const db = DB.getCollection('autoexport')
      const ae = db.get(task.id)
      if (!ae) throw new Error(`AutoExport ${task.id} not found`)

      debug('AutoExport.starting export', ae)
      ae.status = 'running'
      db.update(ae)

      try {
        let items
        switch (ae.type) {
          case 'collection':
            items = { collection: ae.id }
            break
          case 'library':
            items = { library: ae.id }
            break
          default:
            items = null
        }

        await Translators.translate(ae.translatorID, { exportNotes: ae.exportNotes, useJournalAbbreviation: ae.useJournalAbbreviation}, items, ae.path)
        ae.error = ''
      } catch (err) {
        debug('AutoExport.scheduled failed for', ae, err)
        ae.error = `${err}`
      }

      ae.status = 'done'
      ae.updated = new Date()
      db.update(ae)
    }
  ),

  {
    store: new MemoryStore(),
    // https://bugs.chromium.org/p/v8/issues/detail?id=4718
    setImmediate: setTimeout.bind(null),
  }
)
scheduled.resume()

const debounce_delay = 1000
const scheduler = new Queue(
  queueHandler(
    async task => {
      task = {...task}
      debug('AutoExport.scheduler.exec:', task)

      const db = DB.getCollection('autoexport')
      const ae = db.get(task.id)
      if (!ae) throw new Error(`AutoExport ${task.id} not found`)

      debug('AutoExport.scheduler.task found:', task, '->', ae, !!ae)
      ae.status = 'scheduled'
      db.update(ae)
      debug('AutoExport.scheduler.task scheduled, waiting...', task, ae)

      await Zotero.Promise.delay(debounce_delay)

      debug('AutoExport.scheduler.task scheduled, woken', task, ae)

      if (task.cancelled) {
        debug('AutoExport.canceled export', ae)
      } else {
        debug('AutoExport.scheduled export', ae)
        scheduled.push(task)
      }
    }
  ),

  {
    store: new MemoryStore(),
    cancelIfRunning: true,
    // https://bugs.chromium.org/p/v8/issues/detail?id=4718
    setImmediate: setTimeout.bind(null),
  }
)

if (Prefs.get('autoExport') !== 'immediate') { scheduler.pause() }

if (Zotero.Debug.enabled) {
  for (const event of [ 'empty', 'drain', 'task_queued', 'task_accepted', 'task_started', 'task_finish', 'task_failed', 'task_progress', 'batch_finish', 'batch_failed', 'batch_progress' ]) {
    (e => scheduler.on(e, (...args) => { debug(`AutoExport.scheduler.${e}`, args) }))(event);
    (e => scheduled.on(e, (...args) => { debug(`AutoExport.scheduled.${e}`, args) }))(event)
  }
}

const idleObserver = {
  observe(subject, topic, data) {
    debug(`AutoExport.idle: ${topic}`)
    if (Prefs.get('autoExport') !== 'idle') { return }
    switch (topic) {
      case 'back': case 'active':
        scheduler.pause()
        break

      case 'idle':
        scheduler.resume()
        break
    }
  },
}
const idleService = Components.classes['@mozilla.org/widget/idleservice;1'].getService(Components.interfaces.nsIIdleService)
idleService.addIdleObserver(idleObserver, Prefs.get('autoExportIdleWait'))

Events.on('preference-changed', pref => {
  if (pref !== 'autoExport') { return }

  debug('AutoExport: preference changed')

  switch (Prefs.get('autoExport')) {
    case 'immediate':
      scheduler.resume()
      break
    default: // / off / idle
      scheduler.pause()
  }
})

class AutoExport {
  public db: any

  constructor() {
    Events.on('libraries-changed', ids => this.schedule('library', ids))
    Events.on('libraries-removed', ids => this.remove('library', ids))
    Events.on('collections-changed', ids => this.schedule('collection', ids))
    Events.on('collections-removed', ids => this.remove('collection', ids))
  }

  public init() {
    this.db = DB.getCollection('autoexport')
    for (const ae of this.db.find({ status: { $ne: 'done' } })) {
      scheduler.push({ id: ae.$loki })
    }

    if (Prefs.get('autoExport') === 'immediate') { scheduler.resume() }
  }

  public add(ae) {
    debug('AutoExport.add', ae)
    this.db.removeWhere({ path: ae.path })
    this.db.insert(ae)
  }

  public changed(items) {
    const changed = {
      collections: new Set,
      libraries: new Set,
    }

    for (const item of items) {
      changed.libraries.add(item.libraryID)

      for (let collectionID of item.getCollections()) {
        if (changed.collections.has(collectionID)) continue

        while (collectionID) {
          changed.collections.add(collectionID)
          collectionID = Zotero.Collections.get(collectionID).parentID
        }
      }
    }

    if (changed.collections.size) Events.emit('collections-changed', Array.from(changed.collections))
    if (changed.libraries.size) Events.emit('libraries-changed', Array.from(changed.libraries))
  }

  public schedule(type, ids) {
    debug('AutoExport.schedule', type, ids, {db: this.db.data, state: Prefs.get('autoExport'), scheduler: !scheduler._stopped, scheduled: !scheduled._stopped})
    for (const ae of this.db.find({ type, id: { $in: ids } })) {
      debug('AutoExport.scheduler.push', ae.$loki)
      scheduler.push({ id: ae.$loki })
    }
  }

  public remove(type, ids) {
    debug('AutoExport.remove', type, ids, {db: this.db.data, state: Prefs.get('autoExport'), scheduler: !scheduler._stopped, scheduled: !scheduled._stopped})
    for (const ae of this.db.find({ type, id: { $in: ids } })) {
      scheduled.cancel(ae.$loki)
      scheduler.cancel(ae.$loki)
      this.db.remove(ae)
    }
  }

  public run(ae) {
    if (typeof ae === 'number') { ae = this.db.get(ae) }

    debug('Autoexport.run:', ae)
    ae.status = 'scheduled'
    this.db.update(ae)
    scheduled.push({ id: ae.$loki })
  }
}

export = new AutoExport()
